import { prisma as _prisma } from './db';

// Re-export the existing singleton Prisma client from db.ts as `prisma`.
export const prisma = _prisma;

export default prisma;
