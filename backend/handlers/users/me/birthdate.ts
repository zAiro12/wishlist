import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../../../lib/auth-middleware';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { ZodError } from 'zod';
import { UpdateProfileSchema } from '../../../lib/validators';

// This handler updates only the current user's birthdate
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method !== 'PATCH') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Reuse the birthdate validation from UpdateProfileSchema but require birthdate
      const parsed = UpdateProfileSchema.pick({ birthdate: true }).parse(authedReq.body);
      if (!parsed.birthdate) {
        authedRes.status(400).json({ error: 'birthdate is required' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: authedReq.user.userId },
        data: { birthdate: parsed.birthdate, birthdateConfirmed: true },
      });

      authedRes.status(200).json({ birthdate: updated.birthdate });
    } catch (err) {
      if (err instanceof ZodError) {
        authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
        return;
      }
      throw err;
    }
  });
}
