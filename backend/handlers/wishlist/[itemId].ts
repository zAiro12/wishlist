import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { UpdateWishlistItemSchema } from '../../lib/validators';
import { AppError, ForbiddenError, NotFoundError } from '../../lib/authz';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const itemId = authedReq.query['itemId'] as string;

    if (!itemId) {
      authedRes.status(400).json({ error: 'Item ID required' });
      return;
    }

    try {
      const item = await prisma.wishlistItem.findUnique({ where: { id: itemId } });

      if (!item || item.deletedAt !== null) {
        throw new NotFoundError('Wishlist item');
      }

      if (item.ownerId !== userId) {
        throw new ForbiddenError('Only the item owner can modify this item');
      }

      if (authedReq.method === 'PATCH') {
        const parsed = UpdateWishlistItemSchema.parse(authedReq.body);

        const updateData: Record<string, unknown> = {};
        if (parsed.title !== undefined) updateData['title'] = parsed.title;
        if (parsed.description !== undefined) updateData['description'] = parsed.description;
        if (parsed.url !== undefined) updateData['url'] = parsed.url || null;
        if (parsed.imageUrl !== undefined) updateData['imageUrl'] = parsed.imageUrl || null;
        // priority intentionally ignored by API — keep DB column for compatibility but do not expose via handlers

        const updated = await prisma.wishlistItem.update({ where: { id: itemId }, data: updateData });

        try {
          await prisma.adminAction.create({ data: { actorId: userId, action: 'ITEM_UPDATED', details: { itemId } } });
        } catch (e) {
          console.error('Failed to write audit for ITEM_UPDATED', e);
        }

        authedRes.status(200).json({ ...updated, status: null });
        return;
      }

      if (authedReq.method === 'DELETE') {
        await prisma.wishlistItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });

        try {
          await prisma.adminAction.create({ data: { actorId: userId, action: 'ITEM_DELETED', details: { itemId } } });
        } catch (e) {
          console.error('Failed to write audit for ITEM_DELETED', e);
        }

        authedRes.status(200).json({ message: 'Item deleted' });
        return;
      }

      authedRes.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      if (err instanceof ZodError) {
        authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
        return;
      }
      if (err instanceof AppError) {
        authedRes.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}
