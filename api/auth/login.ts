import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthorizationUrl, isValidProvider } from '../backend/lib/oauth';
import { setCors } from '../backend/lib/cors';
import { createState } from '../backend/lib/oauth-state';

// GET /api/auth/login?provider=google|github|microsoft
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const provider = req.query['provider'];
  if (typeof provider !== 'string' || !isValidProvider(provider)) {
    res.status(400).json({ error: 'Invalid provider. Use google, github, or microsoft' });
    return;
  }

  // State is HMAC-signed with a random nonce to prevent CSRF.
  // The nonce is also stored in an HttpOnly SameSite=Lax cookie so the callback
  // can verify the request came from the same browser session (login-CSRF protection).
  const { state, nonce } = createState(provider);

  // HttpOnly + SameSite=Lax binds the nonce to this browser session.
  // Mark the cookie Secure in production so it is only sent over HTTPS.
  const cookie =
    `oauth_nonce=${nonce}; HttpOnly; SameSite=Lax; Path=/api/auth/callback; Max-Age=600` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : '');
  res.setHeader('Set-Cookie', cookie);

  try {
    const url = getAuthorizationUrl(provider, state);
    res.redirect(302, url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Failed to build authorization URL: ${message}` });
  }
}

