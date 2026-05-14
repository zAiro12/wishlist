import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';

const ALLOWED_KEYS = new Set(['princess_user_id']);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method === 'GET') {
      const settings = await prisma.appSetting.findMany();
      const result: Record<string, string> = {};
      for (const s of settings) result[s.key] = s.value;
      authedRes.status(200).json(result);
      return;
    }

    if (authedReq.method === 'PUT') {
      const { key, value } = authedReq.body as { key?: string; value?: string };

      if (!key || !ALLOWED_KEYS.has(key)) {
        authedRes.status(400).json({ error: 'Invalid or missing setting key' });
        return;
      }

      if (typeof value !== 'string') {
        authedRes.status(400).json({ error: 'Value must be a string' });
        return;
      }

      if (key === 'princess_user_id' && value !== '') {
        const user = await prisma.user.findUnique({ where: { id: value }, select: { id: true } });
        if (!user) {
          authedRes.status(404).json({ error: 'User not found' });
          return;
        }
      }

      const setting = await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });

      await prisma.adminAction.create({
        data: {
          actorId: authedReq.user.userId,
          action: 'SETTING_UPDATED',
          details: { key, value: value || null },
        },
      });

      authedRes.status(200).json({ key: setting.key, value: setting.value });
      return;
    }

    authedRes.status(405).json({ error: 'Method not allowed' });
  });
}
