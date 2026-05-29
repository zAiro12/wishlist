import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { buildGroupUserSelect } from '../../../lib/groups-dto';
import {
  assertGroupMember,
  assertGroupOwner,
  AppError,
} from '../../../lib/authz';
import { handleGroupJoin } from './join';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;

    if (!groupId) {
      authedRes.status(400).json({ error: 'Group ID required' });
      return;
    }

    try {
      if (authedReq.method === 'GET') {
        await assertGroupMember(userId, groupId);
        const canViewEmail = authedReq.user.dbUser.role === 'ADMIN';
        const memberUserSelect = buildGroupUserSelect(canViewEmail, { includeBirthdate: true });

        const members = await prisma.groupMember.findMany({
          where: { groupId, removedAt: null },
          include: { user: { select: memberUserSelect } },
          orderBy: { joinedAt: 'asc' },
        });

        authedRes.status(200).json(members);
        return;
      }

      if (authedReq.method === 'POST') {
        await handleGroupJoin(authedReq, authedRes, groupId, userId);
        return;
      }

      if (authedReq.method === 'DELETE') {
        const targetUserId = (authedReq.query['userId'] as string) ?? userId;
        const isSelf = targetUserId === userId;

        if (isSelf) {
          await assertGroupMember(userId, groupId);
        } else {
          await assertGroupOwner(userId, groupId);
        }

        const targetMembership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });

        if (targetMembership?.removedAt) {
          authedRes.status(404).json({ error: 'Member not found' });
          return;
        }

        if (targetMembership == null) {
          authedRes.status(404).json({ error: 'Member not found' });
          return;
        }

        await prisma.$transaction(async (tx) => {
          await tx.groupMember.update({ where: { id: targetMembership.id }, data: { removedAt: new Date() } });

          const remaining = await tx.groupMember.findMany({ where: { groupId, removedAt: null, userId: { not: targetUserId } }, orderBy: { joinedAt: 'asc' } });

          if (remaining.length === 0) {
            await tx.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } });
          } else {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (group?.ownerId === targetUserId) {
              await tx.group.update({ where: { id: groupId }, data: { ownerId: remaining[0].userId } });
            }
          }
          await tx.adminAction.create({ data: { actorId: userId, targetUserId: targetUserId, action: 'GROUP_LEFT', details: { groupId, removedByOwner: !isSelf } } });
        });

        authedRes.status(200).json({ message: 'Member removed' });
        return;
      }

      authedRes.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      if (err instanceof AppError) {
        authedRes.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}
