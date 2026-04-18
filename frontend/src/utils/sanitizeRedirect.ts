export function sanitizeRedirectTarget(value: unknown): string {
  if (!value) return '/';
  let v: string;
  if (Array.isArray(value)) v = String(value[0] ?? '');
  else v = String(value);
  v = v.trim();
  if (!v) return '/';

  // If the redirect is the setup page or contains it, avoid loops
  if (v === '/setup-birthdate') return '/';
  if (v.startsWith('/setup-birthdate')) return '/';
  if (v.includes('/setup-birthdate?')) return '/';
  if (v.includes('redirect=/setup-birthdate')) return '/';

  // Ensure path-like value: prefer absolute paths starting with '/'
  if (!v.startsWith('/')) return '/';

  return v;
}

export default sanitizeRedirectTarget;
