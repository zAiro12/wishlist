import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthorizationUrl, isValidProvider } from '../../lib/oauth';
import { setCors } from '../../lib/cors';
import { createState } from '../../lib/oauth-state';

const AUTH_REQUIRED = ['FRONTEND_URL', 'GOOGLE_CLIENT_ID', 'GITHUB_CLIENT_ID', 'MICROSOFT_CLIENT_ID']
const authMissing = AUTH_REQUIRED.filter((k) => !process.env[k])
if (authMissing.length) console.warn('auth/login missing ENV:', authMissing.join(','))

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

  const { state, nonce } = createState(provider);

  const cookieParts = [
    `oauth_nonce=${nonce}`,
    'HttpOnly',
    'SameSite=None',
    'Path=/api/auth/callback',
    'Max-Age=600',
  ];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');

  const cookiesToSet: string[] = [cookieParts.join('; ')];

  // Preserve a frontend redirect parameter through the OAuth flow by storing
  // it in a short-lived cookie scoped to the callback path.
  const redirectParam = typeof req.query['redirect'] === 'string' ? req.query['redirect'] as string : '';
  if (redirectParam) {
    const redirectCookieParts = [
      `oauth_redirect=${encodeURIComponent(redirectParam)}`,
      'HttpOnly',
      'SameSite=None',
      'Secure',
      'Path=/api/auth/callback',
      'Max-Age=600',
    ];
    cookiesToSet.push(redirectCookieParts.join('; '));
  }

  res.setHeader('Set-Cookie', cookiesToSet);

  try {
    const url = getAuthorizationUrl(provider, state);
    res.redirect(302, url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Failed to build authorization URL: ${message}` });
  }
}
