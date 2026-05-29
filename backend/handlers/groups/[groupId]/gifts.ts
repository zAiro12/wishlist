import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { buildGroupUserSelect } from '../../../lib/groups-dto';
import { assertGroupMember, AppError } from '../../../lib/authz';
import { CreateGroupGiftBatchSchema } from '../../../lib/validators';
import { ZodError } from 'zod';

type GiftUser = {
  id: string;
  givenName: string | null;
  familyName: string | null;
  email?: string;
};

type GroupMemberUser = {
  id: string;
  givenName: string | null;
  familyName: string | null;
  email?: string;
} | null | undefined;

type GiftBatchSettlement = {
  id: string;
  batchId: string;
  debtorUserId: string;
  amountCents: number;
  settledAt: Date | null;
  settledByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  debtor: GroupMemberUser;
  settledBy: GroupMemberUser;
};

type GiftBatchRow = {
  id: string;
  groupId: string;
  title: string;
  giftNames: string[];
  note: string | null;
  totalAmountCents: number;
  paidByUserId: string;
  paidAt: Date;
  beneficiaryIds: string[];
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  paidBy: GroupMemberUser;
  createdBy: GroupMemberUser;
  settlements: GiftBatchSettlement[];
};

type TransactionClient = typeof prisma extends {
  $transaction(fn: (client: infer T) => Promise<unknown>, ...args: unknown[]): unknown;
}
  ? T
  : never;

function mapUser(user: GroupMemberUser): GiftUser | null {
  if (!user) return null;
  return {
    id: user.id,
    givenName: user.givenName,
    familyName: user.familyName,
    ...(user.email ? { email: user.email } : {}),
  };
}

function isGiftUser(user: GiftUser | null): user is GiftUser {
  return user !== null;
}

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
      await assertGroupMember(userId, groupId);
      const canViewEmail = authedReq.user.dbUser.role === 'ADMIN';
      const userSelect = buildGroupUserSelect(canViewEmail);

      const members = await prisma.groupMember.findMany({
        where: { groupId, removedAt: null },
        include: { user: { select: userSelect } },
      }) as Array<{ userId: string; user: GroupMemberUser }>;
      const memberMap: Map<string, GiftUser | null> = new Map(
        members.map((member) => [member.userId, mapUser(member.user)] as const)
      );
      const activeMemberIds = new Set<string>(members.map((member) => member.userId));

      if (authedReq.method === 'GET') {
        const batches = await prisma.groupGiftBatch.findMany({
          where: { groupId },
          include: {
            paidBy: { select: userSelect },
            createdBy: { select: userSelect },
            settlements: {
              include: {
                debtor: { select: userSelect },
                settledBy: { select: userSelect },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { paidAt: 'desc' },
        }) as GiftBatchRow[];

        const visibleBatches = batches
          .filter((batch) => canViewEmail || !batch.beneficiaryIds.includes(userId))
          .map((batch) => ({
            ...batch,
            paidBy: mapUser(batch.paidBy),
            createdBy: mapUser(batch.createdBy),
            beneficiaries: batch.beneficiaryIds
              .map((beneficiaryId) => memberMap.get(beneficiaryId) ?? null)
              .filter(isGiftUser),
            settlements: batch.settlements.map((settlement) => ({
              ...settlement,
              debtor: mapUser(settlement.debtor),
              settledBy: mapUser(settlement.settledBy),
            })),
          }));

        authedRes.status(200).json(visibleBatches);
        return;
      }

      if (authedReq.method === 'POST') {
        const parsed = CreateGroupGiftBatchSchema.parse(authedReq.body);

        const participantIds = [
          parsed.paidByUserId,
          ...parsed.beneficiaryUserIds,
          ...parsed.settlements.map((settlement: { userId: string }) => settlement.userId),
        ];
        for (const id of participantIds) {
          if (!activeMemberIds.has(id)) {
            authedRes.status(400).json({ error: 'All participants must be active group members' });
            return;
          }
        }

        const batch = await prisma.$transaction(async (tx: TransactionClient) => {
          const created = await tx.groupGiftBatch.create({
            data: {
              groupId,
              title: parsed.title.trim(),
              giftNames: parsed.giftNames.map((giftName: string) => giftName.trim()),
              note: parsed.note?.trim() || null,
              totalAmountCents: parsed.totalAmountCents,
              paidByUserId: parsed.paidByUserId,
              paidAt: new Date(`${parsed.paidAt}T12:00:00.000Z`),
              beneficiaryIds: parsed.beneficiaryUserIds,
              createdByUserId: userId,
            },
          });

          await Promise.all(
            parsed.settlements.map((settlement: { userId: string; amountCents: number }) =>
              tx.groupGiftSettlement.create({
                data: {
                  batchId: created.id,
                  debtorUserId: settlement.userId,
                  amountCents: settlement.amountCents,
                },
              })
            )
          );

          await tx.adminAction.create({
            data: {
              actorId: userId,
              action: 'GIFT_BATCH_CREATED',
              details: {
                groupId,
                batchId: created.id,
                title: created.title,
                totalAmountCents: created.totalAmountCents,
              },
            },
          });

          return created;
        });

        authedRes.status(201).json({ message: 'Gift batch created', batchId: batch.id });
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
      if (err instanceof Error) {
        authedRes.status(500).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}