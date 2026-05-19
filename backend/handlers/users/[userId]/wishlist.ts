import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../../lib/auth-middleware';
import { setCors } from '../../../../lib/cors';
import { prisma } from '../../../../lib/prisma';
import { buildGroupUserSelect } from '../../../../lib/groups-dto';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ownerId = authedReq.query['userId'] as string;
    if (!ownerId) {
      authedRes.status(400).json({ error: 'User ID required' });
      return;
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: buildGroupUserSelect(false),
    });

    if (!owner) {
      authedRes.status(404).json({ error: 'User not found' });
      return;
    }

    const items = await prisma.wishlistItem.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        url: true,
        imageUrl: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: buildGroupUserSelect(false) },
      },
    });

    const maskedItems = items.map((item) => ({ ...item, status: null }));
    authedRes.status(200).json(maskedItems);
  });
}
