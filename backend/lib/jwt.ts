import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Sign a JWT for auth usage. Use a long-lived token for refreshable sessions.
export function signJwt(payload: { userId: string; role: string }): string {
  return jwt.sign({ userId: payload.userId, role: payload.role }, SECRET as string, {
    algorithm: 'HS256',
    expiresIn: '30d',
  });
}

// Verify JWT and return payload or throw UnauthorizedError
export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET as string) as JwtPayload;
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// Backwards-compatible aliases
export const signToken = (p: { userId: string; role: string }) => signJwt(p);
export const verifyToken = (t: string) => verifyJwt(t);
