import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookieParts = [
    'auth_token=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));

  res.status(200).json({ message: 'Logged out successfully' });
}
