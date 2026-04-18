import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '@prisma/client';
import { verifyJwt, type JwtPayload } from './jwt';
import { prisma } from './prisma';
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

function getAuthToken(req: VercelRequest): string | null {
  const cookies = parseCookies(req.headers.cookie ?? '');
  const cookieToken = cookies['auth_token'];

  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

async function getAuthenticatedUser(token: string): Promise<JwtPayload & { dbUser: DbUser }> {
  const payload = verifyJwt(token);

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!dbUser) {
    throw new UnauthorizedError('User not found');
  }

  if (dbUser.bannedAt) {
    throw new ForbiddenError('Account banned');
  }

  return { ...payload, dbUser };
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  try {
    const token = getAuthToken(req);

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await getAuthenticatedUser(token);
    (req as AuthedRequest).user = user;

    await handler(req as AuthedRequest, res);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }

    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message });
      return;
    }

    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  await requireAuth(req, res, async (authedReq, authedRes) => {
    if (authedReq.user.dbUser.role !== 'ADMIN') {
      authedRes.status(403).json({ error: 'Admin access required' });
      return;
    }

    await handler(authedReq, authedRes);
  });
}

export function requireGroupMember(groupIdParam = 'groupId') {
  return async function (req: VercelRequest, res: VercelResponse, handler: Handler) {
    await requireAuth(req, res, async (authedReq, authedRes) => {
      const groupId = (authedReq.query[groupIdParam] ?? authedReq.body?.groupId) as string;

      if (!groupId) {
        authedRes.status(400).json({ error: 'groupId is required' });
        return;
      }

      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: authedReq.user.userId,
          },
        },
      });

      if (!membership) {
        authedRes.status(403).json({ error: 'Not a group member' });
        return;
      }

      await handler(authedReq, authedRes);
    });
  };
}

export function requireGroupOwner(groupIdParam = 'groupId') {
  return async function (req: VercelRequest, res: VercelResponse, handler: Handler) {
    await requireAuth(req, res, async (authedReq, authedRes) => {
      const groupId = (authedReq.query[groupIdParam] ?? authedReq.body?.groupId) as string;

      if (!groupId) {
        authedRes.status(400).json({ error: 'groupId is required' });
        return;
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

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
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('User is not a member of this group');
  }
}