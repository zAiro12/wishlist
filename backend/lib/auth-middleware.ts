import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyJwt, type JwtPayload } from './jwt';
import { prisma } from './prisma';
import type { User } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from './errors';

type DbUser = User;

export interface AuthedRequest extends VercelRequest {
  user: JwtPayload & { dbUser: DbUser };
}

type Handler = (req: AuthedRequest, res: VercelResponse) => Promise<void>;

function parseCookies(header = ''): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  try {
    // Prefer cookie-based auth_token, fallback to Authorization header
    const cookies = parseCookies(req.headers.cookie ?? '');
    const headerAuth = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization!.slice(7) : null;
    const token = cookies['auth_token'] ?? headerAuth;

    // Diagnostic logging for /api/users/me to debug 401 after auth callback
    try {
      const isMe = (req.url ?? '').includes('/api/users/me');
      if (isMe) {
        const headerPresent = !!req.headers.authorization;
        const headerPreview = headerPresent ? String(req.headers.authorization).slice(0, 20) + '...' : 'none';
        const cookiePresent = !!cookies['auth_token'];
        const cookiePreview = cookiePresent ? String(cookies['auth_token']).slice(0, 8) + '...' : 'none';
        console.info('[auth-debug] /api/users/me request', { path: req.url, headerPresent, headerPreview, cookiePresent, cookiePreview });
      }
    } catch (logErr) { void logErr; }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let payload: JwtPayload;
    try {
      payload = verifyJwt(token);
    } catch (verifyErr) {
      // If this was /api/users/me, log the verification error for debugging
      try {
        if ((req.url ?? '').includes('/api/users/me')) {
          console.error('[auth-debug] JWT verify failed for /api/users/me:', (verifyErr as Error).message);
        }
      } catch (logErr) { void logErr; }
      throw verifyErr;
    }
    const dbUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!dbUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (dbUser.bannedAt) {
      res.status(403).json({ error: 'Account banned' });
      return;
    }

    (req as AuthedRequest).user = { ...payload, dbUser };
    await handler(req as AuthedRequest, res);
  } catch (err) {
    res.status(401).json({ error: (err instanceof UnauthorizedError) ? err.message : 'Invalid or expired token' });
  }
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  await requireAuth(req, res, async (authedReq, authedRes) => {
    // Check the DB role (not the JWT claim) so demoted admins lose access immediately
    if (authedReq.user.dbUser.role !== 'ADMIN') {
      authedRes.status(403).json({ error: 'Admin access required' });
      return;
    }
    await handler(authedReq, authedRes);
  });
}

// Middleware factory: require that the requester is a member of the given groupId
export function requireGroupMember(groupIdParam = 'groupId') {
  return async function (req: VercelRequest, res: VercelResponse, handler: Handler) {
    await requireAuth(req, res, async (authedReq, authedRes) => {
      const groupId = (authedReq.query[groupIdParam] ?? authedReq.body?.groupId) as string;
      if (!groupId) {
        authedRes.status(400).json({ error: 'groupId is required' });
        return;
      }
      const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: authedReq.user.userId } } });
      if (!membership) {
        authedRes.status(403).json({ error: 'Not a group member' });
        return;
      }
      await handler(authedReq, authedRes);
    });
  };
}

// Middleware factory: require that the requester is the owner of the given groupId
export function requireGroupOwner(groupIdParam = 'groupId') {
  return async function (req: VercelRequest, res: VercelResponse, handler: Handler) {
    await requireAuth(req, res, async (authedReq, authedRes) => {
      const groupId = (authedReq.query[groupIdParam] ?? authedReq.body?.groupId) as string;
      if (!groupId) {
        authedRes.status(400).json({ error: 'groupId is required' });
        return;
      }
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        authedRes.status(404).json({ error: 'Group not found' });
        return;
      }
      if (group.ownerId !== authedReq.user.userId) {
        authedRes.status(403).json({ error: 'Only group owner allowed' });
        return;
      }
      await handler(authedReq, authedRes);
    });
  };
}

export async function assertGroupMember(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership) throw new ForbiddenError('User is not a member of this group');
}
