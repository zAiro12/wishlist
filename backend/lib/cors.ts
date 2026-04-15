import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0 && !process.env.FRONTEND_URL) {
  throw new Error('ALLOWED_ORIGINS or FRONTEND_URL must be configured in production.');
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://zairo12.github.io').replace(/\/+$/, '');

export function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin ?? '').toString();

  // Prefer explicit allowed origin when provided by ALLOWED_ORIGINS
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to configured FRONTEND_URL (must be a specific origin when credentials are used)
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  }

  // Allow credentials and required methods/headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
