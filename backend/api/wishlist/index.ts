import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/db';
import { CreateWishlistItemSchema } from '../../lib/validators';
import { ZodError } from 'zod';

// GET  /api/wishlist  → my wishlist items (status hidden for own items)
// POST /api/wishlist  → create new item
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.sub;

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

        authedRes.status(201).json(item);
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
