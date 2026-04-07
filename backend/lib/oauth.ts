interface OAuthUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  birthdate?: string;
}

interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  getUserInfo: (accessToken: string) => Promise<OAuthUserInfo>;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

const PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    get clientId() { return requireEnv('GOOGLE_CLIENT_ID'); },
    get clientSecret() { return requireEnv('GOOGLE_CLIENT_SECRET'); },
    get redirectUri() { return requireEnv('GOOGLE_REDIRECT_URI'); },
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'profile'],
    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google user info');
      const data = await res.json() as Record<string, unknown>;
      return {
        sub: String(data['sub'] ?? ''),
        email: String(data['email'] ?? ''),
        emailVerified: Boolean(data['email_verified']),
        givenName: data['given_name'] ? String(data['given_name']) : undefined,
        familyName: data['family_name'] ? String(data['family_name']) : undefined,
        birthdate: data['birthdate'] ? String(data['birthdate']) : undefined,
      };
    },
  },

  github: {
    get clientId() { return requireEnv('GITHUB_CLIENT_ID'); },
    get clientSecret() { return requireEnv('GITHUB_CLIENT_SECRET'); },
    get redirectUri() { return requireEnv('GITHUB_REDIRECT_URI'); },
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'user:email'],
    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const [userRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        }),
        fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        }),
      ]);

      if (!userRes.ok) throw new Error('Failed to fetch GitHub user info');
      const user = await userRes.json() as Record<string, unknown>;

      let email = user['email'] ? String(user['email']) : '';
      let emailVerified = false;

      if (emailsRes.ok) {
        const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emails.find((e) => e.primary && e.verified);
        if (primary) {
          email = primary.email;
          emailVerified = true;
        }
      }

      // GitHub name is typically "First Last"
      const nameParts = (user['name'] ? String(user['name']) : '').split(' ');
      const givenName = nameParts[0] ?? undefined;
      const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

      return {
        sub: String(user['id'] ?? ''),
        email,
        emailVerified,
        givenName: givenName || undefined,
        familyName: familyName || undefined,
        // GitHub does not provide birthdate
        birthdate: undefined,
      };
    },
  },

  microsoft: {
    get clientId() { return requireEnv('MICROSOFT_CLIENT_ID'); },
    get clientSecret() { return requireEnv('MICROSOFT_CLIENT_SECRET'); },
    get redirectUri() { return requireEnv('MICROSOFT_REDIRECT_URI'); },
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['openid', 'email', 'profile', 'User.Read'],
    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,displayName,givenName,surname,userPrincipalName', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Microsoft user info');
      const data = await res.json() as Record<string, unknown>;
      const email = (data['mail'] ?? data['userPrincipalName'] ?? '') as string;
      return {
        sub: String(data['id'] ?? ''),
        email,
        emailVerified: email.length > 0,
        givenName: data['givenName'] ? String(data['givenName']) : undefined,
        familyName: data['surname'] ? String(data['surname']) : undefined,
        birthdate: undefined,
      };
    },
  },
};

export function getProvider(name: string): OAuthProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  return provider;
}

export function getAuthorizationUrl(providerName: string, state: string): string {
  const provider = getProvider(providerName);
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
  });

  if (providerName === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'select_account');
  }

  if (providerName === 'microsoft') {
    params.set('response_mode', 'query');
  }

  return `${provider.authUrl}?${params.toString()}`;
}

export async function exchangeCode(providerName: string, code: string): Promise<OAuthUserInfo> {
  const provider = getProvider(providerName);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uri: provider.redirectUri,
    code,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (providerName === 'github') {
    headers['Accept'] = 'application/json';
  }

  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Token exchange failed: ${body}`);
  }

  const tokenData = await tokenRes.json() as Record<string, unknown>;
  const accessToken = String(tokenData['access_token'] ?? '');

  if (!accessToken) {
    throw new Error('No access token received');
  }

  return provider.getUserInfo(accessToken);
}

export const VALID_PROVIDERS = ['google', 'github', 'microsoft'] as const;
export type ValidProvider = (typeof VALID_PROVIDERS)[number];

export function isValidProvider(name: string): name is ValidProvider {
  return VALID_PROVIDERS.includes(name as ValidProvider);
}
