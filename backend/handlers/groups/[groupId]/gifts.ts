import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { buildGroupUserSelect } from '../../../lib/groups-dto';
import { assertGroupMember, AppError } from '../../../lib/authz';
import { CreateGroupGiftBatchSchema } from '../../../lib/validators';
import { ZodError } from 'zod';
import { sendPushToUsers } from '../../push';
import { getActorDisplayName } from '../../../lib/push-utils';

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
  note: string | null;
  totalAmountCents: number;
  paidByUserId: string;
  paidAt: Date;
  beneficiaryIds: string[];
  createdByUserId: string;
  closedAt: Date | null;
  closedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  paidBy: GroupMemberUser;
  createdBy: GroupMemberUser;
  closedBy: GroupMemberUser;
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

function formatGiftUserName(user: GiftUser | null): string {
  return user?.givenName?.trim() || user?.familyName?.trim() || user?.email?.trim() || 'un utente';
}

function formatEuroFromCents(amountCents: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amountCents / 100);
}

async function notifyGiftDebtors(params: {
  recipientUserIds: string[];
  actorName: string;
  batchId: string;
  title: string;
  totalAmountCents: number;
  paidByName: string;
  groupId: string;
}): Promise<void> {
  const { recipientUserIds, actorName, batchId, title, totalAmountCents, paidByName, groupId } = params;
  const recipients = Array.from(new Set(recipientUserIds.filter(Boolean)));
  if (recipients.length === 0) return;

  await sendPushToUsers(recipients, {
    type: 'GIFT_SETTLEMENT_ASSIGNED',
    title: 'Nuovo saldo da fare',
    body: `${actorName} ha creato "${title}": devi saldare ${formatEuroFromCents(totalAmountCents)} a ${paidByName}`,
    data: {
      groupId,
      batchId,
      title,
      totalAmountCents,
    },
  });
}

async function listGiftBatches(params: {
  groupId: string;
  userId: string;
  canViewEmail: boolean;
  includeClosed: boolean;
  userSelect: ReturnType<typeof buildGroupUserSelect>;
  memberMap: Map<string, GiftUser | null>;
  authedRes: VercelResponse;
}): Promise<void> {
  const { groupId, userId, canViewEmail, includeClosed, userSelect, memberMap, authedRes } = params;

  const batches = await prisma.groupGiftBatch.findMany({
    where: {
      groupId,
      ...(includeClosed ? {} : { closedAt: null }),
    },
    include: {
      paidBy: { select: userSelect },
      createdBy: { select: userSelect },
      closedBy: { select: userSelect },
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
      closedBy: mapUser(batch.closedBy),
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
}

async function createGiftBatch(params: {
  groupId: string;
  userId: string;
  memberMap: Map<string, GiftUser | null>;
  parsed: {
    title: string;
    note?: string;
    totalAmountCents: number;
    paidByUserId: string;
    paidAt: string;
    settlements: Array<{ userId: string; amountCents: number }>;
    beneficiaryUserIds: string[];
  };
  authedReq: AuthedRequest;
  authedRes: VercelResponse;
}): Promise<void> {
  const { groupId, userId, memberMap, parsed, authedReq, authedRes } = params;

  const batch = await prisma.$transaction(async (tx: TransactionClient) => {
    const created = await tx.groupGiftBatch.create({
      data: {
        groupId,
        title: parsed.title.trim(),
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

  try {
    const actorName = getActorDisplayName(authedReq.user.dbUser);
    const paidByName = formatGiftUserName(memberMap.get(parsed.paidByUserId) ?? null);
    await notifyGiftDebtors({
      recipientUserIds: parsed.settlements.map((settlement) => settlement.userId),
      actorName,
      batchId: batch.id,
      title: batch.title,
      totalAmountCents: batch.totalAmountCents,
      paidByName,
      groupId,
    });
  } catch (pushErr) {
    console.error('Failed to send push notifications for GIFT_BATCH_CREATED', pushErr);
  }

  authedRes.status(201).json({ message: 'Gift batch created', batchId: batch.id });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;
    const includeClosedRaw = authedReq.query['includeClosed'];
    const includeClosedValue = Array.isArray(includeClosedRaw) ? includeClosedRaw[0] : includeClosedRaw;
    const includeClosed = includeClosedValue === 'true';

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
        await listGiftBatches({ groupId, userId, canViewEmail, includeClosed, userSelect, memberMap, authedRes });
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

        await createGiftBatch({ groupId, userId, memberMap, parsed, authedReq, authedRes });
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