import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { assertHasConfirmedBirthdate, AppError } from '../../../lib/authz';

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
      if (authedReq.method !== 'POST') {
        authedRes.status(405).json({ error: 'Method not allowed' });
        return;
      }

      assertHasConfirmedBirthdate(authedReq.user.dbUser);

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group || group.deletedAt !== null) {
        authedRes.status(404).json({ error: 'Group not found' });
        return;
      }

      const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });

      if (existing && existing.removedAt === null) {
        authedRes.status(409).json({ error: 'Already a member of this group' });
        return;
      }

      if (existing) {
        const updated = await prisma.groupMember.update({ where: { id: existing.id }, data: { removedAt: null, joinedAt: new Date() } });
        await prisma.adminAction.create({ data: { actorId: userId, action: 'GROUP_JOINED', details: { groupId, userId } } });
        authedRes.status(200).json(updated);
      } else {
        const membership = await prisma.groupMember.create({ data: { groupId, userId } });
        await prisma.adminAction.create({ data: { actorId: userId, action: 'GROUP_JOINED', details: { groupId, userId } } });
        authedRes.status(201).json(membership);
      }
    } catch (err) {
      if (err instanceof AppError) {
        authedRes.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}
