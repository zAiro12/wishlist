import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { AdminUpdateUserSchema, PaginationSchema } from '../../lib/validators';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method === 'GET') {
      // Single-user lookup: GET /api/admin/users?id=xxx
      const singleId = authedReq.query['id'] as string | undefined;
      if (singleId && authedReq.method === 'GET') {
        const user = await prisma.user.findUnique({
          where: { id: singleId },
          select: {
            id: true,
            email: true,
            emailVerified: true,
            givenName: true,
            familyName: true,
            avatarUrl: true,
            birthdate: true,
            birthdateConfirmed: true,
            role: true,
            status: true,
            bannedAt: true,
            bannedReason: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!user) {
          authedRes.status(404).json({ error: 'User not found' });
          return;
        }
        authedRes.status(200).json(user);
        return;
      }

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
               avatarUrl: true,
               birthdate: true,
               birthdateConfirmed: true,
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
        const { action, reason, givenName, familyName, avatarUrl, birthdate, role } = AdminUpdateUserSchema.parse(authedReq.body);

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) {
          authedRes.status(404).json({ error: 'User not found' });
          return;
        }

        if (action && targetId === authedReq.user.userId) {
          authedRes.status(400).json({ error: 'You cannot modify your own account status' });
          return;
        }

        if (role !== undefined && targetId === authedReq.user.userId) {
          authedRes.status(400).json({ error: 'You cannot change your own role' });
          return;
        }

        if (role !== undefined && target.role === 'ADMIN' && role !== 'ADMIN') {
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            authedRes.status(400).json({ error: 'You cannot demote the last remaining admin' });
            return;
          }
        }

        let updateData: Record<string, unknown> = {};
        if (action) {
          if (action === 'ban') {
            updateData = { ...updateData, status: 'BANNED', bannedAt: new Date(), bannedReason: reason ?? null };
          } else if (action === 'unban') {
            updateData = { ...updateData, status: 'ACTIVE', bannedAt: null, bannedReason: null };
          } else if (action === 'disable') {
            updateData = { ...updateData, status: 'DISABLED' };
          } else if (action === 'enable') {
            updateData = { ...updateData, status: 'ACTIVE' };
          }
        }
        if (givenName !== undefined) updateData['givenName'] = givenName;
        if (familyName !== undefined) updateData['familyName'] = familyName;
        if (avatarUrl !== undefined) updateData['avatarUrl'] = avatarUrl || null;
        if (birthdate !== undefined) {
          updateData['birthdate'] = birthdate || null;
          updateData['birthdateConfirmed'] = Boolean(birthdate);
        }
        if (role !== undefined) updateData['role'] = role;

        const mappedAction =
          action === 'ban'
            ? 'USER_BANNED'
            : action === 'unban'
            ? 'USER_UNBANNED'
            : action === 'disable'
            ? 'USER_DISABLED'
            : action === 'enable'
            ? 'USER_ENABLED'
            : 'USER_UPDATED';

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
