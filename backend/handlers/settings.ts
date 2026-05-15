import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';
import { ensureAppSettingTable } from '../lib/app-setting-table';

/** Public settings keys that any authenticated user may read. */
const PUBLIC_KEYS = ['princess_user_id'];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAuth(req, res, async (_authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (_authedReq.method !== 'GET') {
      authedRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    console.info('[settings] GET start', { userId: _authedReq.user.userId });
    try {
      await ensureAppSettingTable();
      const settings = await prisma.appSetting.findMany({
        where: { key: { in: PUBLIC_KEYS } },
      });

      const result: Record<string, string> = {};
      for (const s of settings) result[s.key] = s.value;
      console.info('[settings] GET success', { count: settings.length, userId: _authedReq.user.userId });
      authedRes.status(200).json(result);
    } catch (err) {
      console.error('[settings] GET failed', { userId: _authedReq.user.userId, message: err instanceof Error ? err.message : String(err), code: (err as { code?: string })?.code });
      throw err;
    }
  });
}
