import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';
import { requireAuth, type AuthedRequest } from '../../../../../lib/auth-middleware';
import { assertGroupMember, AppError, BadRequestError, ForbiddenError } from '../../../../../lib/authz';
import { setCors } from '../../../../../lib/cors';
import { prisma } from '../../../../../lib/prisma';
import { UpdateGroupGiftBatchClosureSchema } from '../../../../../lib/validators';
import { sendPushToUsers } from '../../../../push';
import { getActorDisplayName } from '../../../../../lib/push-utils';

type TransactionClient = typeof prisma extends {
  $transaction(fn: (client: infer T) => Promise<unknown>, ...args: unknown[]): unknown;
}
  ? T
  : never;

async function notifyGiftBatchClosureChanged(params: {
  authedReq: AuthedRequest;
  debtorUserIds: string[];
  actorUserId: string;
  groupId: string;
  giftId: string;
  title: string;
  closed: boolean;
}): Promise<void> {
  const { authedReq, debtorUserIds, actorUserId, groupId, giftId, title, closed } = params;
  const recipients = Array.from(new Set(debtorUserIds.filter((id) => id && id !== actorUserId)));
  if (recipients.length === 0) return;

  const actorName = getActorDisplayName(authedReq.user.dbUser);
  await sendPushToUsers(recipients, {
    type: closed ? 'GIFT_BATCH_CLOSED' : 'GIFT_BATCH_REOPENED',
    title: closed ? 'Regalo chiuso' : 'Regalo riaperto',
    body: closed
      ? `${actorName} ha chiuso "${title}"`
      : `${actorName} ha riaperto "${title}"`,
    data: {
      groupId,
      giftId,
      title,
      closed,
    },
  });
}

async function updateGiftBatchClosure(params: {
  authedReq: AuthedRequest;
  authedRes: VercelResponse;
  userId: string;
  groupId: string;
  giftId: string;
  parsed: { closed: boolean };
}): Promise<void> {
  const { authedReq, authedRes, userId, groupId, giftId, parsed } = params;

  const batch = await prisma.groupGiftBatch.findUnique({
    where: { id: giftId },
    include: {
      settlements: {
        select: {
          id: true,
          debtorUserId: true,
          settledAt: true,
        },
      },
    },
  });

  if (!batch || batch.groupId !== groupId) {
    authedRes.status(404).json({ error: 'Gift batch not found' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.deletedAt !== null) {
    authedRes.status(404).json({ error: 'Group not found' });
    return;
  }

  const isOwner = group.ownerId === userId;
  const isAdmin = authedReq.user.dbUser.role === 'ADMIN';
  const isBeneficiary = batch.beneficiaryIds.includes(userId);

  if (parsed.closed) {
    if (isBeneficiary && !isOwner && !isAdmin) {
      throw new ForbiddenError('Beneficiaries cannot close this gift batch');
    }

    const allSettled = batch.settlements.length > 0 && batch.settlements.every((settlement) => settlement.settledAt !== null);
    if (!allSettled) {
      throw new BadRequestError('All settlements must be paid before closing this gift batch');
    }
  } else if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Only group owner or admin can reopen this gift batch');
  }

  const nextClosedAt = parsed.closed ? batch.closedAt ?? new Date() : null;
  const nextClosedByUserId = parsed.closed ? userId : null;

  const updated = await prisma.$transaction(async (tx: TransactionClient) => {
    const result = await tx.groupGiftBatch.update({
      where: { id: giftId },
      data: {
        closedAt: nextClosedAt,
        closedByUserId: nextClosedByUserId,
      },
    });

    await tx.adminAction.create({
      data: {
        actorId: userId,
        action: parsed.closed ? 'GIFT_BATCH_CLOSED' : 'GIFT_BATCH_REOPENED',
        details: {
          groupId,
          giftId,
        },
      },
    });

    return result;
  });

  try {
    await notifyGiftBatchClosureChanged({
      authedReq,
      debtorUserIds: batch.settlements.map((settlement) => settlement.debtorUserId),
      actorUserId: userId,
      groupId,
      giftId,
      title: batch.title,
      closed: parsed.closed,
    });
  } catch (pushErr) {
    console.error('Failed to send push notifications for gift batch closure update', pushErr);
  }

  authedRes.status(200).json(updated);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;
    const giftId = authedReq.query['giftId'] as string;

    if (!groupId || !giftId) {
      authedRes.status(400).json({ error: 'Group ID and gift ID required' });
      return;
    }

    if (authedReq.method !== 'PATCH') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      await assertGroupMember(userId, groupId);
      const parsed = UpdateGroupGiftBatchClosureSchema.parse(authedReq.body);
      await updateGiftBatchClosure({ authedReq, authedRes, userId, groupId, giftId, parsed });
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
