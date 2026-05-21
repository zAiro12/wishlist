import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { CreateWishlistItemSchema } from '../../lib/validators';
import { ZodError } from 'zod';
import { sendPushToUsers } from '../push';
import { getActorDisplayName } from '../../lib/push-utils';

async function notifyGroupMembersAboutItemChange(params: {
  actorUserId: string;
  itemId: string;
  itemTitle: string;
  title: string;
  body: string;
  notificationType: 'ITEM_ADDED' | 'ITEM_UPDATED' | 'ITEM_DELETED';
  logContext: string;
}): Promise<void> {
  const { actorUserId, itemId, itemTitle, title, body, notificationType, logContext } = params;

  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: actorUserId, removedAt: null, group: { deletedAt: null } },
      select: {
        group: {
          select: {
            members: {
              where: { removedAt: null, userId: { not: actorUserId } },
              select: { userId: true },
            },
          },
        },
      },
    });

    const recipients = new Set<string>();
    for (const membership of memberships) {
      for (const member of membership.group.members) {
        recipients.add(member.userId);
      }
    }

    if (recipients.size === 0) return;

    await sendPushToUsers(Array.from(recipients), {
      type: notificationType,
      title,
      body,
      data: {
        ownerId: actorUserId,
        itemId,
        itemTitle,
      },
    });
  } catch (pushErr) {
    console.error(`Failed to send push notifications for ${logContext}`, pushErr);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;

    if (authedReq.method === 'GET') {
      const items = await prisma.wishlistItem.findMany({ where: { ownerId: userId, deletedAt: null }, include: { status: true }, orderBy: [{ createdAt: 'asc' }] });
      const maskedItems = items.map((item) => ({ ...item, status: null }));
      authedRes.status(200).json(maskedItems);
      return;
    }

    if (authedReq.method === 'POST') {
      try {
        const parsed = CreateWishlistItemSchema.parse(authedReq.body);

        const item = await prisma.wishlistItem.create({ data: { ownerId: userId, title: parsed.title, description: parsed.description, url: parsed.url || null, imageUrl: parsed.imageUrl || null } });

        try {
          await prisma.adminAction.create({ data: { actorId: userId, action: 'ITEM_CREATED', details: { itemId: item.id, title: item.title } } });
        } catch (e) {
          console.error('Failed to write audit for ITEM_CREATED', e);
        }

        const actorName = getActorDisplayName(authedReq.user.dbUser);
        await notifyGroupMembersAboutItemChange({
          actorUserId: userId,
          itemId: item.id,
          itemTitle: item.title,
          notificationType: 'ITEM_ADDED',
          title: 'Nuovo desiderio aggiunto',
          body: `${actorName} ha aggiunto "${item.title}" alla wishlist`,
          logContext: 'ITEM_CREATED',
        });

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
