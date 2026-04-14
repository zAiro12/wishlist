import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { assertGroupMember, daysUntilNextBirthday, AppError } from '../../../lib/authz';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    const userId = authedReq.user.userId;
    const groupId = authedReq.query['groupId'] as string;

    if (!groupId) {
      authedRes.status(400).json({ error: 'Group ID required' });
      return;
    }

    if (authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      await assertGroupMember(userId, groupId);

      const members = await prisma.groupMember.findMany({ where: { groupId, removedAt: null }, include: { user: { select: { id: true, givenName: true, familyName: true, email: true, birthdate: true } } } });

      const withBirthdate = members
        .filter((m) => m.user.birthdate !== null)
        .map((m) => ({ user: m.user, daysUntil: daysUntilNextBirthday(m.user.birthdate!) }));

      if (withBirthdate.length === 0) {
        authedRes.status(200).json({ nextCelebrated: [], daysUntil: null });
        return;
      }

      const minDays = Math.min(...withBirthdate.map((m) => m.daysUntil));
      const nextCelebrated = withBirthdate.filter((m) => m.daysUntil === minDays);

      authedRes.status(200).json({ nextCelebrated: nextCelebrated.map((m) => m.user), daysUntil: minDays });
    } catch (err) {
      if (err instanceof AppError) {
        authedRes.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  });
}
