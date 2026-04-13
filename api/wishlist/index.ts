import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../backend/lib/auth-middleware';
import { setCors } from '../backend/lib/cors';
import { prisma } from '../backend/lib/prisma';
import { CreateWishlistItemSchema } from '../backend/lib/validators';
import { ZodError } from 'zod';

// GET  /api/wishlist  → my wishlist items (status hidden for own items)
// POST /api/wishlist  → create new item
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;

    if (authedReq.method === 'GET') {
      const items = await prisma.wishlistItem.findMany({
        where: { ownerId: userId, deletedAt: null },
        include: { status: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      // Owner never sees status on their own items (null hides all metadata)
      const maskedItems = items.map((item) => ({
        ...item,
        status: null,
      }));

      authedRes.status(200).json(maskedItems);
      return;
    }

    if (authedReq.method === 'POST') {
      try {
        const parsed = CreateWishlistItemSchema.parse(authedReq.body);

        const item = await prisma.wishlistItem.create({
          data: {
            ownerId: userId,
            title: parsed.title,
            description: parsed.description,
            url: parsed.url || null,
            imageUrl: parsed.imageUrl || null,
            priority: parsed.priority,
          },
        });

        try {
          await prisma.adminAction.create({
            data: {
              actorId: userId,
              action: 'ITEM_CREATED',
              details: { itemId: item.id, title: item.title },
            },
          });
        } catch (e) {
          console.error('Failed to write audit for ITEM_CREATED', e);
        }

        // Match GET response shape: owner never sees status on their own items
        authedRes.status(201).json({ ...item, status: null });
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

