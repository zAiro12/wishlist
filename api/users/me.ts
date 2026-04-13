import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../backend/lib/auth-middleware';
import { setCors } from '../backend/lib/cors';
import { prisma } from '../backend/lib/prisma';
import { UpdateProfileSchema } from '../backend/lib/validators';
import { ZodError } from 'zod';

function safeUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  birthdate: string | null;
  birthdateConfirmed: boolean;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    givenName: user.givenName,
    familyName: user.familyName,
    birthdate: user.birthdate,
    birthdateConfirmed: user.birthdateConfirmed,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// GET  /api/users/me  → current user profile
// PATCH /api/users/me → update profile
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method === 'GET') {
      const user = await prisma.user.findUnique({ where: { id: authedReq.user.userId } });
      if (!user) {
        authedRes.status(404).json({ error: 'User not found' });
        return;
      }
      authedRes.status(200).json(safeUser(user));
      return;
    }

    if (authedReq.method === 'PATCH') {
      try {
        const parsed = UpdateProfileSchema.parse(authedReq.body);
        const updateData: Record<string, unknown> = {};

        if (parsed.givenName !== undefined) updateData['givenName'] = parsed.givenName;
        if (parsed.familyName !== undefined) updateData['familyName'] = parsed.familyName;
        if (parsed.birthdate !== undefined) {
          updateData['birthdate'] = parsed.birthdate;
          updateData['birthdateConfirmed'] = true;
        }

        const updated = await prisma.user.update({
          where: { id: authedReq.user.userId },
          data: updateData,
        });

        authedRes.status(200).json(safeUser(updated));
      } catch (err) {
        if (err instanceof ZodError) {
          authedRes.status(400).json({ error: 'Validation failed', issues: err.errors });
          return;
        }
        throw err;
      }
      return;
    }

    authedRes.status(405).json({ error: 'Method not allowed' });
  });
}

