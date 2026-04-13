import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';
import { PaginationSchema } from '../lib/validators';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { page, limit, search } = PaginationSchema.parse(authedReq.query);
      const skip = (page - 1) * limit;

      const where = search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {};

      const [groups, total] = await Promise.all([
        prisma.group.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, email: true, givenName: true, familyName: true } },
            _count: { select: { members: true } },
          },
        }),
        prisma.group.count({ where }),
      ]);

      authedRes.status(200).json({ groups, total, page, limit });
    } catch (err) {
      if (err instanceof ZodError) {
        authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
        return;
      }
      throw err;
    }
  });
}
