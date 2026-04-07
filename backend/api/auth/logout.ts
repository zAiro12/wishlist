import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../lib/cors';

// POST /api/auth/logout
// Stateless: client discards the JWT. Server-side only for CORS/audit purposes.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({ message: 'Logged out successfully' });
}
