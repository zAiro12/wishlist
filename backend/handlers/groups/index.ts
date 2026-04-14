import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { CreateGroupSchema, UpdateGroupSchema } from '../../lib/validators';
import { assertHasConfirmedBirthdate } from '../../lib/authz';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;

    if (authedReq.method === 'GET') {
      const memberships = await prisma.groupMember.findMany({
        where: { userId, removedAt: null },
        include: {
          group: {
            include: {
              owner: { select: { id: true, givenName: true, familyName: true, email: true } },
              _count: { select: { members: { where: { removedAt: null } } } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      const groups = memberships
        .filter((m) => m.group.deletedAt === null)
        .map((m) => ({
          ...m.group,
          memberCount: m.group._count.members,
          joinedAt: m.joinedAt,
        }));

      authedRes.status(200).json(groups);
      return;
    }

    if (authedReq.method === 'POST') {
      try {
        assertHasConfirmedBirthdate(authedReq.user.dbUser);
        const parsed = CreateGroupSchema.parse(authedReq.body);

        const group = await prisma.$transaction(async (tx) => {
          const g = await tx.group.create({
            data: {
              name: parsed.name,
              description: parsed.description,
              ownerId: userId,
            },
          });

          await tx.groupMember.create({ data: { groupId: g.id, userId } });

          await tx.adminAction.create({
            data: {
              actorId: userId,
              action: 'GROUP_CREATED',
              details: { groupId: g.id, name: g.name },
            },
          });

          return g;
        });

        authedRes.status(201).json(group);
      } catch (err) {
        if (err instanceof ZodError) {
          authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
          return;
        }
        if (err instanceof Error && err.message.includes('birthdate')) {
          authedRes.status(400).json({ error: err.message });
          return;
        }
        throw err;
      }
      return;
    }

    authedRes.status(405).json({ error: 'Method not allowed' });
  });
}
