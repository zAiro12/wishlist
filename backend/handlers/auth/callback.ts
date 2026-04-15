import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCode, isValidProvider } from '../../lib/oauth';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';
import { setCors } from '../../lib/cors';
import { verifyState } from '../../lib/oauth-state';
import type { StateVerifyResult } from '../../lib/oauth-state';

const CALLBACK_REQUIRED = ['JWT_SECRET', 'FRONTEND_URL']
const callbackMissing = CALLBACK_REQUIRED.filter((k) => !process.env[k])
if (callbackMissing.length) console.warn('auth/callback missing ENV:', callbackMissing.join(','))

const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')

function parseCookies(header: string): Record<string, string> {
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

function clearNonceCookie(res: VercelResponse): void {
  const cookieParts = [
    'oauth_nonce=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth/callback',
    'Max-Age=0',
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function redirectError(res: VercelResponse, error: string): void {
  clearNonceCookie(res);
  res.redirect(302, `${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error)}`);
}

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

  if (typeof state !== 'string') {
    redirectError(res, 'invalid_state');
    return;
  }

  const cookies = parseCookies(req.headers.cookie ?? '');
  const cookieNonce = cookies['oauth_nonce'] ?? '';

  const stateResult: StateVerifyResult = verifyState(state, provider, cookieNonce);
  if (!stateResult.ok) {
    // Narrowing across module boundaries can sometimes be finicky; use a safe cast to access `reason`.
    const reason = (stateResult as { reason?: string }).reason ?? 'invalid_state';
    redirectError(res, reason);
    return;
  }

  clearNonceCookie(res);

  try {
    const userInfo = await exchangeCode(provider, code);

    if (!userInfo.email) {
      redirectError(res, 'no_email');
      return;
    }

    const email = userInfo.email.toLowerCase().trim();

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
      const updates: Record<string, unknown> = {};
      if (!user.emailVerified && userInfo.emailVerified) updates['emailVerified'] = true;
      if (!user.givenName && userInfo.givenName) updates['givenName'] = userInfo.givenName;
      if (!user.familyName && userInfo.familyName) updates['familyName'] = userInfo.familyName;
      if (!user.birthdate && userInfo.birthdate) {
        updates['birthdate'] = userInfo.birthdate;
        updates['birthdateConfirmed'] = true;
      }
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    if (user.status === 'BANNED') {
      redirectError(res, 'account_banned');
      return;
    }
    if (user.status === 'DISABLED') {
      redirectError(res, 'account_disabled');
      return;
    }

    await prisma.userIdentity.upsert({
      where: { provider_providerSub: { provider, providerSub: userInfo.sub } },
      create: { userId: user.id, provider, providerSub: userInfo.sub },
      update: { userId: user.id },
    });

    try {
      await prisma.adminAction.create({
        data: {
          actorId: user.id,
          action: 'USER_LOGIN',
          details: { provider },
        },
      });
    } catch (auditErr) {
      console.error('Failed to write adminAction audit for login:', auditErr);
    }

    const token = signToken({ userId: user.id, role: user.role });

    const needsBirthdate = !user.birthdate || !user.birthdateConfirmed;

    const cookieParts = [
      `auth_token=${encodeURIComponent(token)}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${15 * 60}`,
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));

    const target = needsBirthdate
      ? `${FRONTEND_URL}/#/auth/callback?needsBirthdate=true`
      : `${FRONTEND_URL}/#`;
    res.redirect(302, target);
  } catch (err) {
    console.error('OAuth callback error:', err);
    redirectError(res, 'server_error');
  }
}
