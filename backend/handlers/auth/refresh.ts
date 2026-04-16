import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';
import { setCors } from '../../../lib/cors';
import { signToken } from '../../../lib/jwt';

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

  // Prefer cookie-based token, fallback to Authorization header
  const cookies = parseCookies(req.headers.cookie ?? '');
  const raw = cookies['auth_token'] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization!.slice(7) : null);
  if (!raw) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  // Verify signature and read payload even if expired
  let payload: any;
  try {
    payload = jwt.verify(raw, process.env.JWT_SECRET as string, { ignoreExpiration: true }) as any;
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;

  // Allow refresh if token is not older than 7 days since expiration
  const GRACE = 7 * 24 * 60 * 60; // 7 days in seconds
  if (exp > 0 && exp + GRACE < now) {
    res.status(401).json({ error: 'Token expired too long ago' });
    return;
  }

  // Ensure user still exists
  const userId = payload.userId as string;
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Issue a new token (30d as configured in jwt.sign)
  const newToken = signToken({ userId: dbUser.id, role: dbUser.role });

  const cookieParts = [
    `auth_token=${encodeURIComponent(newToken)}`,
    'HttpOnly',
    'SameSite=None',
    'Path=/',
    `Max-Age=${30 * 24 * 60 * 60}`,
  ];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));

  res.status(200).json({ token: newToken });
}
