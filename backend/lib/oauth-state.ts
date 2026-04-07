import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

interface StatePayload {
  provider: string;
  ts: number;
  nonce: string;
}

/** OAuth state is valid for 10 minutes */
const STATE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Create a cryptographically signed, tamper-proof OAuth state parameter.
 * Format: base64url(JSON payload) + "." + HMAC-SHA256 signature
 */
export function createState(provider: string): string {
  const payload: StatePayload = {
    provider,
    ts: Date.now(),
    nonce: randomBytes(16).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET as string).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export type StateVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_state' | 'state_mismatch' | 'state_expired' };

/**
 * Verify the state parameter, checking HMAC signature, provider match, and expiry (10 min).
 */
export function verifyState(state: string, provider: string): StateVerifyResult {
  const dotIdx = state.lastIndexOf('.');
  if (dotIdx === -1) return { ok: false, reason: 'invalid_state' };

  const payloadB64 = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);

  const expectedSig = createHmac('sha256', SECRET as string).update(payloadB64).digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { ok: false, reason: 'invalid_state' };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as StatePayload;
  } catch {
    return { ok: false, reason: 'invalid_state' };
  }

  if (payload.provider !== provider) return { ok: false, reason: 'state_mismatch' };
  if (Date.now() - payload.ts > STATE_EXPIRY_MS) return { ok: false, reason: 'state_expired' };

  return { ok: true };
}
