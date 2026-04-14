import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';
import { SetStatusSchema, ClearStatusSchema } from '../lib/validators';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  assertGroupMember,
  shareAtLeastOneGroup,
} from '../lib/authz';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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
      const item = await prisma.wishlistItem.findUnique({ where: { id: itemId }, include: { status: true } });

      if (!item || item.deletedAt !== null) {
        throw new NotFoundError('Wishlist item');
      }

      if (item.ownerId === userId) {
        throw new ForbiddenError('You cannot modify the status of your own wishlist items');
      }

      const shares = await shareAtLeastOneGroup(userId, item.ownerId);
      if (!shares) {
        throw new ForbiddenError('You must share a group with this user to modify item status');
      }

      if (authedReq.method === 'PUT') {
        const parsed = SetStatusSchema.parse(authedReq.body);
        const { status, groupId, version } = parsed;

        await assertGroupMember(userId, groupId);
        await assertGroupMember(item.ownerId, groupId);

        const currentStatus = item.status;

        if (currentStatus && currentStatus.status !== 'DISPONIBILE' && currentStatus.statusGroupId !== groupId) {
          throw new ForbiddenError('This item is already reserved by another group. Only that group can modify its status.');
        }

        if (!currentStatus) {
          try {
            const created = await prisma.wishlistItemStatus.create({ data: { itemId, status, statusGroupId: groupId, setByUserId: userId, version: 1 } });
            try {
              await prisma.adminAction.create({ data: { actorId: userId, action: 'STATUS_CHANGED', details: { itemId, status, groupId } } });
            } catch (e) {
              console.error('Failed to write audit for STATUS_CHANGED (create)', e);
            }
            authedRes.status(200).json(created);
          } catch (createErr) {
            if (createErr instanceof PrismaClientKnownRequestError && createErr.code === 'P2002') {
              throw new ConflictError('Item status was modified concurrently. Please refresh and try again.');
            }
            throw createErr;
          }
        } else {
          if (currentStatus.version !== version) {
            throw new ConflictError('Item status was modified concurrently. Please refresh and try again.');
          }

          const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.wishlistItemStatus.updateMany({ where: { itemId, version }, data: { status, statusGroupId: groupId, setByUserId: userId, version: version + 1 } });
            if (result.count === 0) {
              throw new ConflictError('Item status was modified concurrently. Please refresh and try again.');
            }
            return tx.wishlistItemStatus.findUnique({ where: { itemId } });
          });
          try {
            await prisma.adminAction.create({ data: { actorId: userId, action: 'STATUS_CHANGED', details: { itemId, status, groupId } } });
          } catch (e) {
            console.error('Failed to write audit for STATUS_CHANGED (update)', e);
          }

          authedRes.status(200).json(updated);
        }
        return;
      }

      if (authedReq.method === 'DELETE') {
        const parsed = ClearStatusSchema.parse(authedReq.body);
        const { groupId, version } = parsed;

        const currentStatus = item.status;

        if (!currentStatus) {
          const clearedStatus = await prisma.wishlistItemStatus.upsert({ where: { itemId }, update: {}, create: { itemId, status: 'DISPONIBILE', statusGroupId: null, setByUserId: null, version: 0 } });
          authedRes.status(200).json(clearedStatus);
          return;
        }

        if (currentStatus.status === 'DISPONIBILE') {
          authedRes.status(200).json(currentStatus);
          return;
        }

        if (currentStatus.statusGroupId !== groupId) {
          throw new ForbiddenError('Only a member of the group that set this status can clear it.');
        }

        await assertGroupMember(userId, groupId);

        if (currentStatus.version !== version) {
          throw new ConflictError('Item status was modified concurrently. Please refresh and try again.');
        }

        const updated = await prisma.$transaction(async (tx) => {
          const result = await tx.wishlistItemStatus.updateMany({ where: { itemId, version }, data: { status: 'DISPONIBILE', statusGroupId: null, setByUserId: null, version: version + 1 } });
          if (result.count === 0) {
            throw new ConflictError('Item status was modified concurrently. Please refresh and try again.');
          }
          return tx.wishlistItemStatus.findUnique({ where: { itemId } });
        });

        try {
          await prisma.adminAction.create({ data: { actorId: userId, action: 'STATUS_CHANGED', details: { itemId, status: 'DISPONIBILE', groupId } } });
        } catch (e) {
          console.error('Failed to write audit for STATUS_CHANGED (clear)', e);
        }

        authedRes.status(200).json(updated);
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
