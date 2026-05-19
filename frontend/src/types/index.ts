// Shared types for frontend-backend communication

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DISABLED';
export type ItemStatus = 'DISPONIBILE' | 'PRENOTATO' | 'COMPRATO';

export interface GroupUserSummary {
  id: string;
  givenName: string | null;
  familyName: string | null;
  email?: string;
}

export interface GroupUserBirthdaySummary extends GroupUserSummary {
  birthdate: string | null;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  avatarUrl: string | null;
  birthdate: string | null;
  birthdateConfirmed: boolean;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: GroupUserSummary;
  members?: GroupMember[];
  memberCount?: number;
  joinedAt?: string;
  /** Prisma aggregate included by the admin API */
  _count?: { members: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  removedAt: string | null;
  user?: GroupUserBirthdaySummary;
}

export interface WishlistItem {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: GroupUserSummary;
  status?: WishlistItemStatus | null;
}

export interface SharedWishlistItem {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedWishlistResponse {
  owner: GroupUserSummary;
  items: SharedWishlistItem[];
}

export interface WishlistItemStatus {
  id: string;
  itemId: string;
  status: ItemStatus;
  statusGroupId: string | null;
  setByUserId: string | null;
  updatedAt: string;
  version: number;
}

export interface AdminAction {
  id: string;
  actorId: string;
  targetUserId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor?: Pick<User, 'id' | 'email' | 'givenName' | 'familyName'>;
  targetUser?: Pick<User, 'id' | 'email' | 'givenName' | 'familyName'> | null;
}

export interface ApiError {
  error: string;
  issues?: Array<{ message: string; path: (string | number)[] }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
