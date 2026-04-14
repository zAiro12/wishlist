import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { assertGroupMember, AppError } from '../../../lib/authz';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;

    if (!groupId) {
      authedRes.status(400).json({ error: 'Group ID required' });
      return;
    }

    if (authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      await assertGroupMember(userId, groupId);

      const members = await prisma.groupMember.findMany({ where: { groupId, removedAt: null }, select: { userId: true } });
      const memberIds = members.map((m) => m.userId);

      const items = await prisma.wishlistItem.findMany({
        where: { ownerId: { in: memberIds }, deletedAt: null },
        include: { owner: { select: { id: true, givenName: true, familyName: true, email: true } }, status: true },
        orderBy: [{ ownerId: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
      });

      const maskedItems = items.map((item) => (item.ownerId === userId ? { ...item, status: null } : item));

      authedRes.status(200).json(maskedItems);
    } catch (err) {
      if (err instanceof AppError) {
        authedRes.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}
