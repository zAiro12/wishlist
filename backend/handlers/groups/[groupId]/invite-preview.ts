import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../../lib/cors';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/jwt';

function parseCookies(header = ''): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const groupId = req.query['groupId'] as string;
  if (!groupId) {
    res.status(400).json({ error: 'Group ID required' });
    return;
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: { owner: { select: { id: true, givenName: true, familyName: true } } } });
    if (!group || group.deletedAt !== null) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Count active members
    const memberCount = await prisma.groupMember.count({ where: { groupId, removedAt: null } });

    // Determine if requester is a member if auth token present in cookie or header
    let isMember = false;
    try {
      const cookies = parseCookies(req.headers.cookie ?? '');
      const token = cookies['auth_token'] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization!.slice(7) : null);
      if (token) {
        const payload = verifyToken(token);
        const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: payload.userId } } });
        if (membership && membership.removedAt === null) isMember = true;
      }
    } catch (_) {
      // ignore token errors; treat as unauthenticated
    }

    res.status(200).json({
      id: group.id,
      name: group.name,
      description: group.description ?? null,
      owner: group.owner ? { id: group.owner.id, givenName: group.owner.givenName ?? null, familyName: group.owner.familyName ?? null } : null,
      memberCount,
      isMember,
    });
  } catch (err) {
    throw err;
  }
}
