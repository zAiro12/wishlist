import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { UpdateGroupSchema } from '../../lib/validators';
import { assertGroupMember, assertGroupOwner, AppError } from '../../lib/authz';
import { ZodError } from 'zod';

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
      if (authedReq.method === 'GET') {
        await assertGroupMember(userId, groupId);

        const group = await prisma.group.findUnique({
          where: { id: groupId },
          include: {
            owner: { select: { id: true, givenName: true, familyName: true, email: true } },
            members: {
              where: { removedAt: null },
              include: { user: { select: { id: true, givenName: true, familyName: true, email: true, birthdate: true } } },
              orderBy: { joinedAt: 'asc' },
            },
          },
        });

        if (!group || group.deletedAt !== null) {
          authedRes.status(404).json({ error: 'Group not found' });
          return;
        }

        authedRes.status(200).json(group);
        return;
      }

      if (authedReq.method === 'PATCH') {
        await assertGroupOwner(userId, groupId);
        const parsed = UpdateGroupSchema.parse(authedReq.body);

        const updated = await prisma.group.update({ where: { id: groupId }, data: parsed });

        authedRes.status(200).json(updated);
        return;
      }

      if (authedReq.method === 'DELETE') {
        await assertGroupOwner(userId, groupId);

        const [updated] = await prisma.$transaction([
          prisma.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } }),
          prisma.adminAction.create({ data: { actorId: userId, action: 'GROUP_DELETED', details: { groupId } } }),
        ]);

        authedRes.status(200).json({ message: 'Group deleted', group: updated });
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
