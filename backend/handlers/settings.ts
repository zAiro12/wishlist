import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';

/** Public settings keys that any authenticated user may read. */
const PUBLIC_KEYS = ['princess_user_id'];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (_authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (_authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const settings = await prisma.appSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) result[s.key] = s.value;
    authedRes.status(200).json(result);
  });
}
