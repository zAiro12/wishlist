import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { AdminUpdateUserSchema, PaginationSchema } from '../../lib/validators';
import { ZodError } from 'zod';

// GET   /api/admin/users        → list users with search/pagination
// PATCH /api/admin/users?id=    → ban/unban/disable/enable
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method === 'GET') {
      try {
        const { page, limit, search } = PaginationSchema.parse(authedReq.query);
        const skip = (page - 1) * limit;

        const where = search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { givenName: { contains: search, mode: 'insensitive' as const } },
                { familyName: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              email: true,
              emailVerified: true,
              givenName: true,
              familyName: true,
              birthdate: true,
              role: true,
              status: true,
              bannedAt: true,
              bannedReason: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { groupMemberships: true, wishlistItems: true } },
            },
          }),
          prisma.user.count({ where }),
        ]);

        authedRes.status(200).json({ users, total, page, limit });
      } catch (err) {
        if (err instanceof ZodError) {
          authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
          return;
        }
        throw err;
      }
      return;
    }

    if (authedReq.method === 'PATCH') {
      const targetId = authedReq.query['id'] as string;
      if (!targetId) {
        authedRes.status(400).json({ error: 'User ID required' });
        return;
      }

      try {
        const { action, reason } = AdminUpdateUserSchema.parse(authedReq.body);

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) {
          authedRes.status(404).json({ error: 'User not found' });
          return;
        }

        // Prevent admin from banning themselves
        if (targetId === authedReq.user.userId) {
          authedRes.status(400).json({ error: 'You cannot modify your own account status' });
          return;
        }

        let updateData: Record<string, unknown> = {};
        if (action === 'ban') {
          updateData = { status: 'BANNED', bannedAt: new Date(), bannedReason: reason ?? null };
        } else if (action === 'unban') {
          updateData = { status: 'ACTIVE', bannedAt: null, bannedReason: null };
        } else if (action === 'disable') {
          updateData = { status: 'DISABLED' };
        } else if (action === 'enable') {
          updateData = { status: 'ACTIVE' };
        }

        const mappedAction =
          action === 'ban'
            ? 'USER_BANNED'
            : action === 'unban'
            ? 'USER_UNBANNED'
            : 'ADMIN_ACTION';

        const [updated] = await prisma.$transaction([
          prisma.user.update({ where: { id: targetId }, data: updateData }),
          prisma.adminAction.create({
            data: {
              actorId: authedReq.user.userId,
              targetUserId: targetId,
              action: mappedAction,
              details: { reason },
            },
          }),
        ]);

        authedRes.status(200).json(updated);
      } catch (err) {
        if (err instanceof ZodError) {
          authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
          return;
        }
        throw err;
      }
      return;
    }

    authedRes.status(405).json({ error: 'Method not allowed' });
  });
}
