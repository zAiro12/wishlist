import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCode, isValidProvider } from '../../lib/oauth';
import { prisma } from '../../lib/db';
import { signToken } from '../../lib/jwt';
import { setCors } from '../../lib/cors';
import { verifyState } from '../../lib/oauth-state';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function redirectError(res: VercelResponse, error: string): void {
  res.redirect(302, `${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error)}`);
}

// GET /api/auth/callback?provider=...&code=...&state=...
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { provider, code, state, error: oauthError } = req.query;

  if (oauthError) {
    redirectError(res, String(oauthError));
    return;
  }

  if (typeof provider !== 'string' || !isValidProvider(provider)) {
    redirectError(res, 'invalid_provider');
    return;
  }

  if (typeof code !== 'string' || !code) {
    redirectError(res, 'missing_code');
    return;
  }

  // Validate HMAC-signed state to prevent CSRF
  if (typeof state !== 'string') {
    redirectError(res, 'invalid_state');
    return;
  }

  const stateResult = verifyState(state, provider);
  if (!stateResult.ok) {
    redirectError(res, stateResult.reason);
    return;
  }

  try {
    const userInfo = await exchangeCode(provider, code);

    if (!userInfo.email) {
      redirectError(res, 'no_email');
      return;
    }

    const email = userInfo.email.toLowerCase().trim();

    // Find or create user by email (account linking by email)
    let user = await prisma.user.findUnique({ where: { email } });
    let isFirstLogin = false;

    if (!user) {
      isFirstLogin = true;
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: userInfo.emailVerified,
          givenName: userInfo.givenName,
          familyName: userInfo.familyName,
          birthdate: userInfo.birthdate,
          birthdateConfirmed: Boolean(userInfo.birthdate),
        },
      });
    } else {
      // Update info from provider if fields were empty
      const updates: Record<string, unknown> = { emailVerified: userInfo.emailVerified };
      if (!user.givenName && userInfo.givenName) updates['givenName'] = userInfo.givenName;
      if (!user.familyName && userInfo.familyName) updates['familyName'] = userInfo.familyName;
      if (!user.birthdate && userInfo.birthdate) {
        updates['birthdate'] = userInfo.birthdate;
        updates['birthdateConfirmed'] = true;
      }
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }

    // Check if banned
    if (user.status === 'BANNED') {
      redirectError(res, 'account_banned');
      return;
    }
    if (user.status === 'DISABLED') {
      redirectError(res, 'account_disabled');
      return;
    }

    // Link provider identity
    await prisma.userIdentity.upsert({
      where: { provider_providerSub: { provider, providerSub: userInfo.sub } },
      create: { userId: user.id, provider, providerSub: userInfo.sub },
      update: { userId: user.id },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const needsBirthdate = !user.birthdate || !user.birthdateConfirmed;

    const params = new URLSearchParams({ token });
    if (isFirstLogin) params.set('firstLogin', 'true');
    if (needsBirthdate) params.set('needsBirthdate', 'true');

    // Deliver token via URL fragment to keep it out of server logs and Referer headers
    res.redirect(302, `${FRONTEND_URL}/auth/callback#${params.toString()}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    redirectError(res, 'server_error');
  }
}
