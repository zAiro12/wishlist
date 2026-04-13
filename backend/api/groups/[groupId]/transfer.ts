import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { TransferOwnershipSchema } from '../../../lib/validators';
import { assertGroupOwner, AppError } from '../../../lib/authz';
import { ZodError } from 'zod';

// POST /api/groups/[groupId]/transfer
// Body: { newOwnerId: string }
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;

    if (!groupId) {
      authedRes.status(400).json({ error: 'Group ID required' });
      return;
    }

    if (authedReq.method !== 'POST') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      await assertGroupOwner(userId, groupId);
      const { newOwnerId } = TransferOwnershipSchema.parse(authedReq.body);

      if (newOwnerId === userId) {
        authedRes.status(400).json({ error: 'You are already the owner' });
        return;
      }

      // Verify new owner is an active member
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: newOwnerId } },
      });

      if (!membership || membership.removedAt !== null) {
        authedRes.status(400).json({ error: 'New owner must be an active member of the group' });
        return;
      }

      const updated = await prisma.group.update({
        where: { id: groupId },
        data: { ownerId: newOwnerId },
      });

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
