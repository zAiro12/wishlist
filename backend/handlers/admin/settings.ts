import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, type AuthedRequest } from '../../lib/auth-middleware';
import { setCors } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { ensureAppSettingTable } from '../../lib/app-setting-table';

const ALLOWED_KEYS = new Set(['princess_user_id', 'tester_user_ids']);

function parseUserIds(value: string): string[] {
  if (!value.trim()) return [];
  return Array.from(new Set(value.split(',').map((id) => id.trim()).filter(Boolean)));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await requireAdmin(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (authedReq.method === 'GET') {
      console.debug('[admin/settings] GET start', { userId: authedReq.user.userId });
      try {
        await ensureAppSettingTable();
        const settings = await prisma.appSetting.findMany();
        const result: Record<string, string> = {};
        for (const s of settings) result[s.key] = s.value;
        console.debug('[admin/settings] GET success', { count: settings.length, userId: authedReq.user.userId });
        authedRes.status(200).json(result);
      } catch (err) {
        console.error('[admin/settings] GET failed', { userId: authedReq.user.userId, message: err instanceof Error ? err.message : String(err), code: (err as { code?: string })?.code });
        throw err;
      }
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

      let normalizedValue = value;
      if (key === 'tester_user_ids') {
        const testerIds = parseUserIds(value);
        if (testerIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { id: { in: testerIds } },
            select: { id: true },
          });
          if (users.length !== testerIds.length) {
            authedRes.status(404).json({ error: 'One or more users not found' });
            return;
          }
        }
        normalizedValue = testerIds.join(',');
      }

      console.debug('[admin/settings] PUT start', { userId: authedReq.user.userId, key });
      try {
        await ensureAppSettingTable();
        const setting = await prisma.appSetting.upsert({
          where: { key },
          create: { key, value: normalizedValue },
          update: { value: normalizedValue },
        });

        await prisma.adminAction.create({
          data: {
            actorId: authedReq.user.userId,
            action: 'SETTING_UPDATED',
            details: { key, value: normalizedValue || null },
          },
        });

        console.debug('[admin/settings] PUT success', { userId: authedReq.user.userId, key });
        authedRes.status(200).json({ key: setting.key, value: setting.value });
      } catch (err) {
        console.error('[admin/settings] PUT failed', { userId: authedReq.user.userId, key, message: err instanceof Error ? err.message : String(err), code: (err as { code?: string })?.code });
        throw err;
      }
      return;
    }

    authedRes.status(405).json({ error: 'Method not allowed' });
  });
}
