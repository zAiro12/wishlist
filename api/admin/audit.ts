import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../backend/lib/auth-middleware';
import { setCors } from '../backend/lib/cors';
import { prisma } from '../backend/lib/prisma';
import { PaginationSchema } from '../backend/lib/validators';
import { ZodError } from 'zod';

// GET /api/admin/audit → list admin audit log
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { page, limit } = PaginationSchema.parse(authedReq.query);
      const skip = (page - 1) * limit;

      const [actions, total] = await Promise.all([
        prisma.adminAction.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, email: true, givenName: true, familyName: true } },
            targetUser: { select: { id: true, email: true, givenName: true, familyName: true } },
          },
        }),
        prisma.adminAction.count(),
      ]);

      authedRes.status(200).json({ actions, total, page, limit });
    } catch (err) {
      if (err instanceof ZodError) {
        authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
        return;
      }
      throw err;
    }
  });
}

