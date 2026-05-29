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
import { sendPushToUsers } from '../../push';
import { getActorDisplayName } from '../../../lib/push-utils';

async function removeGroupMember(params: {
  userId: string;
  groupId: string;
  targetUserId: string;
}): Promise<{ isSelf: boolean }> {
  const { userId, groupId, targetUserId } = params;
  const isSelf = targetUserId === userId;

  if (isSelf) {
    await assertGroupMember(userId, groupId);
  } else {
    await assertGroupOwner(userId, groupId);
  }

  const targetMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMembership || targetMembership.removedAt) {
    throw new AppError(404, 'Member not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.update({ where: { id: targetMembership.id }, data: { removedAt: new Date() } });

    const remaining = await tx.groupMember.findMany({
      where: { groupId, removedAt: null, userId: { not: targetUserId } },
      orderBy: { joinedAt: 'asc' },
    });

    if (remaining.length === 0) {
      await tx.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } });
    } else {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (group?.ownerId === targetUserId) {
        await tx.group.update({ where: { id: groupId }, data: { ownerId: remaining[0].userId } });
      }
    }

    await tx.adminAction.create({
      data: { actorId: userId, targetUserId, action: 'GROUP_LEFT', details: { groupId, removedByOwner: !isSelf } },
    });
  });

  return { isSelf };
}

async function notifyGroupMemberLeft(params: {
  groupId: string;
  actorName: string;
  targetUserId: string;
  removedByOwner: boolean;
  leftBySelf: boolean;
}): Promise<void> {
  const { groupId, actorName, targetUserId, removedByOwner, leftBySelf } = params;

  const recipients = await prisma.groupMember.findMany({
    where: { groupId, removedAt: null, userId: { not: targetUserId } },
    select: { userId: true },
  });

  if (recipients.length === 0) return;

  await sendPushToUsers(recipients.map((recipient) => recipient.userId), {
    type: 'GROUP_MEMBER_LEFT',
    title: leftBySelf ? 'Un membro ha lasciato il gruppo' : 'Un membro è stato rimosso',
    body: leftBySelf
      ? `${actorName} ha lasciato il gruppo`
      : `${actorName} ha rimosso un membro dal gruppo`,
    data: {
      groupId,
      targetUserId,
      removedByOwner,
    },
  });
}

async function handleDeleteMember(params: {
  authedReq: AuthedRequest;
  authedRes: VercelResponse;
  userId: string;
  groupId: string;
  targetUserId: string;
}): Promise<void> {
  const { authedReq, authedRes, userId, groupId, targetUserId } = params;
  const { isSelf } = await removeGroupMember({ userId, groupId, targetUserId });

  try {
    const actorName = getActorDisplayName(authedReq.user.dbUser);
    await notifyGroupMemberLeft({
      groupId,
      actorName,
      targetUserId,
      removedByOwner: !isSelf,
      leftBySelf: isSelf,
    });
  } catch (pushErr) {
    console.error('Failed to send push notifications for GROUP_LEFT', pushErr);
  }

  authedRes.status(200).json({ message: 'Member removed' });
}

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
        await handleDeleteMember({ authedReq, authedRes, userId, groupId, targetUserId });
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
