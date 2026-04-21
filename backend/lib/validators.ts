import { z } from 'zod';

// ─── Profile ───────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  givenName: z.string().min(1).max(100).optional(),
  familyName: z.string().min(1).max(100).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val === date.toISOString().slice(0, 10);
    }, 'Invalid date')
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date <= now;
    }, 'Birthdate cannot be in the future')
    .optional(),
});

// ─── Groups ────────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1),
});

// ─── Wishlist ──────────────────────────────────────────────────────────────────

export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const UpdateWishlistItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  // priority intentionally removed from API validation — backend will ignore it
});

// ─── Status ────────────────────────────────────────────────────────────────────

export const SetStatusSchema = z.object({
  status: z.enum(['PRENOTATO', 'COMPRATO']),
  groupId: z.string().min(1),
  version: z.number().int().min(0),
});

export const ClearStatusSchema = z.object({
  groupId: z.string().min(1),
  version: z.number().int().min(0),
});

// ─── Admin ─────────────────────────────────────────────────────────────────────

export const AdminUpdateUserSchema = z.object({
  action: z.enum(['ban', 'unban', 'disable', 'enable']),
  reason: z.string().max(500).optional(),
});

// ─── Pagination ────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});
