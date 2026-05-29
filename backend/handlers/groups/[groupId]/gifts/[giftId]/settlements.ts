import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../../../lib/auth-middleware';
import { setCors } from '../../../../../lib/cors';
import { prisma } from '../../../../../lib/prisma';
import { UpdateGroupGiftSettlementSchema } from '../../../../../lib/validators';
import { assertGroupMember, AppError, ForbiddenError } from '../../../../../lib/authz';
import { ZodError } from 'zod';
import { sendPushToUser } from '../../../../push';
import { getActorDisplayName } from '../../../../../lib/push-utils';

type TransactionClient = typeof prisma extends {
  $transaction(fn: (client: infer T) => Promise<unknown>, ...args: unknown[]): unknown;
}
  ? T
  : never;

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
      const parsed = UpdateGroupGiftSettlementSchema.parse(authedReq.body);

      const settlement = await prisma.groupGiftSettlement.findUnique({
        where: { id: parsed.settlementId },
        include: {
          batch: { select: { id: true, groupId: true, title: true, paidByUserId: true } },
          debtor: { select: { id: true, givenName: true, familyName: true, email: true } },
        },
      });

      if (!settlement?.batch || settlement.batchId !== giftId || settlement.batch.groupId !== groupId) {
        authedRes.status(404).json({ error: 'Settlement not found' });
        return;
      }

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group?.id || group.deletedAt !== null) {
        authedRes.status(404).json({ error: 'Group not found' });
        return;
      }

      const isOwner = group.ownerId === userId;
      const isDebtor = settlement.debtorUserId === userId;
      const isAdmin = authedReq.user.dbUser.role === 'ADMIN';
      if (!isOwner && !isDebtor && !isAdmin) {
        throw new ForbiddenError('Only the debtor, group owner or an admin can update this settlement');
      }

      const wasSettled = settlement.settledAt !== null;

      const updated = await prisma.$transaction(async (tx: TransactionClient) => {
        const nextSettledAt = parsed.settled ? settlement.settledAt ?? new Date() : null;
        const nextSettledByUserId = parsed.settled ? userId : null;

        const result = await tx.groupGiftSettlement.update({
          where: { id: parsed.settlementId },
          data: {
            settledAt: nextSettledAt,
            settledByUserId: nextSettledByUserId,
          },
        });

        await tx.adminAction.create({
          data: {
            actorId: userId,
            action: parsed.settled ? 'GIFT_SETTLEMENT_MARKED' : 'GIFT_SETTLEMENT_REOPENED',
            details: {
              groupId,
              giftId,
              settlementId: parsed.settlementId,
              debtorUserId: settlement.debtorUserId,
            },
          },
        });

        return result;
      });

      if (parsed.settled && !wasSettled) {
        try {
          const actorName = getActorDisplayName(authedReq.user.dbUser);
          const debtorName = settlement.debtor?.givenName?.trim() || settlement.debtor?.familyName?.trim() || settlement.debtor?.email?.trim() || 'un utente';
          await sendPushToUser(settlement.batch.paidByUserId, {
            type: 'GIFT_SETTLEMENT_PAID',
            title: 'Un saldo è stato chiuso',
            body: `${actorName} ha saldato la quota di "${settlement.batch.title}" per ${debtorName}`,
            data: {
              groupId,
              giftId,
              settlementId: parsed.settlementId,
              batchId: settlement.batch.id,
              debtorUserId: settlement.debtorUserId,
              paidByUserId: settlement.batch.paidByUserId,
            },
          });
        } catch (pushErr) {
          console.error('Failed to send push notifications for GIFT_SETTLEMENT_PAID', pushErr);
        }
      }

      authedRes.status(200).json(updated);
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