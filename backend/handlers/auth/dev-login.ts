import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../lib/prisma';
import { signToken } from '../../../lib/jwt';
import { setCors } from '../../../lib/cors';

// Dev-only endpoint to create/sign-in a developer user when running locally.
// Enabled when DEV_AUTH_BYPASS=true and NODE_ENV !== 'production'.

const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  // Verbose dev logging for this endpoint
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_REQUESTS === 'true') {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || ''
      console.info(`[dev-login] request from ${ip} ${req.method} ${req.url}`)
    } catch (e) {}
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    res.status(403).json({ error: 'Dev auth bypass not enabled' });
    return;
  }

  const email = (process.env.DEV_AUTH_EMAIL ?? '').toLowerCase().trim();
  if (!email) {
    res.status(500).json({ error: 'DEV_AUTH_EMAIL not configured' });
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: true,
          givenName: process.env.DEV_AUTH_GIVEN_NAME ?? 'Dev',
          familyName: process.env.DEV_AUTH_FAMILY_NAME ?? 'User',
          birthdateConfirmed: true,
        },
      });
    }

    const token = signToken({ userId: user.id, role: user.role });

    const cookieParts = [
      `auth_token=${encodeURIComponent(token)}`,
      'HttpOnly',
      'SameSite=None',
      'Path=/',
      `Max-Age=${15 * 60}`,
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));

    res.redirect(302, `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Dev login error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}
