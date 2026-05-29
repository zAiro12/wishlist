import { z } from 'zod';

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Profile ───────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  givenName: z.string().min(1).max(100).optional(),
  familyName: z.string().min(1).max(100).optional(),
  avatarUrl: z
    .string()
    .url('Must be a valid URL')
    .max(1000)
    .refine(isHttpUrl, 'Avatar URL must use http or https')
    .optional()
    .or(z.literal('')),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      return !Number.isNaN(date.getTime()) && val === date.toISOString().slice(0, 10);
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

// ─── Group gifts ──────────────────────────────────────────────────────────────

export const GroupGiftSettlementSchema = z.object({
  userId: z.string().min(1),
  amountCents: z.number().int().positive(),
});

export const CreateGroupGiftBatchSchema = z
  .object({
    title: z.string().min(2).max(120),
    note: z.string().max(500).optional(),
    totalAmountCents: z.number().int().positive(),
    paidByUserId: z.string().min(1),
    paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    beneficiaryUserIds: z.array(z.string().min(1)).min(1),
    settlements: z.array(GroupGiftSettlementSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const seenBeneficiaries = new Set<string>();
    for (const userId of value.beneficiaryUserIds) {
      if (seenBeneficiaries.has(userId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['beneficiaryUserIds'], message: 'Beneficiaries must be unique' });
        break;
      }
      seenBeneficiaries.add(userId);
    }

    const seenSettlements = new Set<string>();
    let total = 0;
    for (const settlement of value.settlements) {
      total += settlement.amountCents;
      if (seenSettlements.has(settlement.userId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settlements'], message: 'Each debtor can appear only once' });
        break;
      }
      seenSettlements.add(settlement.userId);
      if (seenBeneficiaries.has(settlement.userId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settlements'], message: 'Beneficiaries cannot also be debtors' });
        break;
      }
    }

    if (total !== value.totalAmountCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['totalAmountCents'], message: 'Total amount must match the sum of settlements' });
    }
  });

export const UpdateGroupGiftSettlementSchema = z.object({
  settlementId: z.string().min(1),
  settled: z.boolean(),
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
  action: z.enum(['ban', 'unban', 'disable', 'enable']).optional(),
  givenName: z.string().min(1).max(100).optional(),
  familyName: z.string().min(1).max(100).optional(),
  avatarUrl: z
    .string()
    .url('Must be a valid URL')
    .max(1000)
    .refine(isHttpUrl, 'Avatar URL must use http or https')
    .optional()
    .or(z.literal('')),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      return !Number.isNaN(date.getTime()) && val === date.toISOString().slice(0, 10);
    }, 'Invalid date')
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date <= now;
    }, 'Birthdate cannot be in the future')
    .optional()
    .or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).optional(),
  reason: z.string().max(500).optional(),
}).refine(
  (val) =>
    val.action !== undefined ||
    val.givenName !== undefined ||
    val.familyName !== undefined ||
    val.avatarUrl !== undefined ||
    val.birthdate !== undefined ||
    val.role !== undefined,
  { message: 'At least one editable field is required' }
);

// ─── Pagination ────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});
