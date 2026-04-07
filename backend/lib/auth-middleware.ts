import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, type JwtPayload } from './jwt';
import { prisma } from './db';
import type { User } from '@prisma/client';

export interface AuthedRequest extends VercelRequest {
  user: JwtPayload & { dbUser: User };
}

type Handler = (req: AuthedRequest, res: VercelResponse) => Promise<void>;

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    const dbUser = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!dbUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (dbUser.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    (req as AuthedRequest).user = { ...payload, dbUser };
    await handler(req as AuthedRequest, res);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler
): Promise<void> {
  await requireAuth(req, res, async (authedReq, authedRes) => {
    if (authedReq.user.role !== 'ADMIN') {
      authedRes.status(403).json({ error: 'Admin access required' });
      return;
    }
    await handler(authedReq, authedRes);
  });
}
