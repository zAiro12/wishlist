import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import {
  assertGroupMember,
  assertGroupOwner,
  assertHasConfirmedBirthdate,
  AppError,
} from '../../../lib/authz';

// GET    /api/groups/[groupId]/members  → list active members
// POST   /api/groups/[groupId]/members  → join group
// DELETE /api/groups/[groupId]/members?userId=  → leave (self) or remove (owner)
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

        const members = await prisma.groupMember.findMany({
          where: { groupId, removedAt: null },
          include: {
            user: {
              select: { id: true, givenName: true, familyName: true, email: true, birthdate: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        });

        authedRes.status(200).json(members);
        return;
      }

      if (authedReq.method === 'POST') {
        // Join group
        assertHasConfirmedBirthdate(authedReq.user.dbUser);

        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group || group.deletedAt !== null) {
          authedRes.status(404).json({ error: 'Group not found' });
          return;
        }

        // Check if already a member
        const existing = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });

        if (existing && existing.removedAt === null) {
          authedRes.status(409).json({ error: 'Already a member of this group' });
          return;
        }

        if (existing) {
          // Rejoin
          const updated = await prisma.groupMember.update({
            where: { id: existing.id },
            data: { removedAt: null, joinedAt: new Date() },
          });
          await prisma.adminAction.create({
            data: { actorId: userId, action: 'GROUP_JOINED', details: { groupId, userId } },
          });
          authedRes.status(200).json(updated);
        } else {
          const membership = await prisma.groupMember.create({
            data: { groupId, userId },
          });
          await prisma.adminAction.create({
            data: { actorId: userId, action: 'GROUP_JOINED', details: { groupId, userId } },
          });

          authedRes.status(201).json(membership);
        }
        return;
      }

      if (authedReq.method === 'DELETE') {
        const targetUserId = (authedReq.query['userId'] as string) ?? userId;
        const isSelf = targetUserId === userId;

        if (!isSelf) {
          // Only owner can remove others
          await assertGroupOwner(userId, groupId);
        } else {
          // Self-leave: must be current member
          await assertGroupMember(userId, groupId);
        }

        const targetMembership = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: targetUserId } },
        });

        if (!targetMembership || targetMembership.removedAt !== null) {
          authedRes.status(404).json({ error: 'Member not found' });
          return;
        }

        await prisma.$transaction(async (tx) => {
          // Remove the member
          await tx.groupMember.update({
            where: { id: targetMembership.id },
            data: { removedAt: new Date() },
          });

          // Check remaining active members
          const remaining = await tx.groupMember.findMany({
            where: { groupId, removedAt: null, userId: { not: targetUserId } },
            orderBy: { joinedAt: 'asc' },
          });

          if (remaining.length === 0) {
            // Last member: soft delete group
            await tx.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } });
          } else {
            // If owner is leaving, transfer ownership to earliest remaining member
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (group && group.ownerId === targetUserId) {
              await tx.group.update({
                where: { id: groupId },
                data: { ownerId: remaining[0].userId },
              });
            }
          }
          await tx.adminAction.create({
            data: {
              actorId: userId,
              targetUserId: targetUserId,
              action: 'GROUP_LEFT',
              details: { groupId, removedByOwner: !isSelf },
            },
          });
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
