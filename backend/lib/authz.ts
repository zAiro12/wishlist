import { prisma } from './db';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

/**
 * Assert that a user is an active member of a group.
 */
export async function assertGroupMember(userId: string, groupId: string): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || membership.removedAt !== null) {
    throw new ForbiddenError('You are not an active member of this group');
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.deletedAt !== null) {
    throw new NotFoundError('Group');
  }
}

/**
 * Assert that a user is the owner of a group.
 */
export async function assertGroupOwner(userId: string, groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.deletedAt !== null) {
    throw new NotFoundError('Group');
  }
  if (group.ownerId !== userId) {
    throw new ForbiddenError('Only the group owner can perform this action');
  }
}

/**
 * Returns group IDs shared between two users (both active, group not deleted).
 */
export async function getSharedGroupIds(userId1: string, userId2: string): Promise<string[]> {
  const [m1, m2] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: userId1, removedAt: null, group: { deletedAt: null } },
      select: { groupId: true },
    }),
    prisma.groupMember.findMany({
      where: { userId: userId2, removedAt: null, group: { deletedAt: null } },
      select: { groupId: true },
    }),
  ]);

  const set1 = new Set(m1.map((m) => m.groupId));
  return m2.map((m) => m.groupId).filter((id) => set1.has(id));
}

/**
 * Check if two users share at least one active group.
 */
export async function shareAtLeastOneGroup(userId1: string, userId2: string): Promise<boolean> {
  const shared = await getSharedGroupIds(userId1, userId2);
  return shared.length > 0;
}

/**
 * Assert that a user has a valid (confirmed) birthdate.
 */
export function assertHasConfirmedBirthdate(user: { birthdate: string | null; birthdateConfirmed: boolean }): void {
  if (!user.birthdate || !user.birthdateConfirmed) {
    throw new BadRequestError('You must confirm your birthdate before joining groups');
  }
}

/**
 * Get number of days until next birthday (0 if today).
 * Ignores year, treats as calendar date.
 */
export function daysUntilNextBirthday(birthdate: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const [, monthStr, dayStr] = birthdate.split('-');
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  let nextBirthday = Date.UTC(today.getFullYear(), month, day);
  if (nextBirthday < todayUtc) {
    nextBirthday = Date.UTC(today.getFullYear() + 1, month, day);
  }

  return Math.round((nextBirthday - todayUtc) / (1000 * 60 * 60 * 24));
}
