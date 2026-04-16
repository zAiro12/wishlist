import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS_RAW = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Normalize allowed origins by extracting the origin part (scheme + host + port)
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.map((o) => {
  try {
    return new URL(o).origin;
  } catch {
    return o.replace(/\/+$|\/$/, '');
  }
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0 && !process.env.FRONTEND_URL) {
  throw new Error('ALLOWED_ORIGINS or FRONTEND_URL must be configured in production.');
}

// FRONTEND_URL may include a path (e.g. https://zairo12.github.io/wishlist).
// Extract only the origin (scheme + host + optional port) for CORS comparisons.
let FRONTEND_URL = process.env.FRONTEND_URL || 'https://zairo12.github.io';
let FRONTEND_ORIGIN = '';
try {
  FRONTEND_ORIGIN = new URL(FRONTEND_URL).origin;
} catch {
  FRONTEND_ORIGIN = FRONTEND_URL.replace(/\/+$/, '');
}

export function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin ?? '').toString();

  // If ALLOWED_ORIGINS is configured and contains the request origin, allow it.
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin === FRONTEND_ORIGIN) {
    // If the request origin matches the configured FRONTEND_URL origin (paths ignored), allow it.
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to the configured frontend origin (do NOT use '*', as credentials are allowed).
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
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
