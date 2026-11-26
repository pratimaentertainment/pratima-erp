import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Plan name must be at least 2 characters')
    .max(100, 'Plan name must not exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  originalMonthlyPrice: z.coerce
    .number()
    .min(0, 'Original monthly price must be 0 or greater')
    .nullable()
    .optional(),
  monthlyPrice: z.coerce
    .number()
    .min(0, 'Monthly price must be 0 or greater'),
  originalAnnualPrice: z.coerce
    .number()
    .min(0, 'Original annual price must be 0 or greater')
    .nullable()
    .optional(),
  annualPrice: z.coerce
    .number()
    .min(0, 'Annual price must be 0 or greater'),
  offerBadgeText: z
    .string()
    .trim()
    .max(50, 'Offer badge text must not exceed 50 characters')
    .nullable()
    .optional(),
  isBasePlan: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  maxBranches: z.coerce
    .number()
    .int('Branches must be a whole number')
    .min(1, 'Must allow at least 1 branch'),
  maxStaff: z.coerce
    .number()
    .int('Staff count must be a whole number')
    .min(1, 'Must allow at least 1 staff member'),
  features: z.array(z.string()).default([]),
  smsCredits: z.coerce
    .number()
    .int('SMS credits must be a whole number')
    .min(0, 'SMS credits cannot be negative')
    .default(0),
  whatsappCredits: z.coerce
    .number()
    .int('WhatsApp credits must be a whole number')
    .min(0, 'WhatsApp credits cannot be negative')
    .default(0),
  allowFranchises: z.boolean().default(false),
  franchiseEnabled: z.boolean().default(false),
  includedAddons: z.array(z.string()).default([]),
  perFranchiseMonthlyPrice: z.coerce
    .number()
    .min(0, 'Per-franchise monthly price must be 0 or greater')
    .default(0),
  perFranchiseAnnualPrice: z.coerce
    .number()
    .min(0, 'Per-franchise annual price must be 0 or greater')
    .default(0),
  isActive: z.boolean().default(true),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Plan name must be at least 2 characters')
    .max(100, 'Plan name must not exceed 100 characters'),
  originalMonthlyPrice: z.coerce
    .number()
    .min(0, 'Original monthly price must be 0 or greater')
    .nullable()
    .optional(),
  monthlyPrice: z.coerce
    .number()
    .min(0, 'Monthly price must be 0 or greater'),
  originalAnnualPrice: z.coerce
    .number()
    .min(0, 'Original annual price must be 0 or greater')
    .nullable()
    .optional(),
  annualPrice: z.coerce
    .number()
    .min(0, 'Annual price must be 0 or greater'),
  offerBadgeText: z
    .string()
    .trim()
    .max(50, 'Offer badge text must not exceed 50 characters')
    .nullable()
    .optional(),
  isBasePlan: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  maxBranches: z.coerce
    .number()
    .int('Branches must be a whole number')
    .min(1, 'Must allow at least 1 branch'),
  maxStaff: z.coerce
    .number()
    .int('Staff count must be a whole number')
    .min(1, 'Must allow at least 1 staff member'),
  features: z.array(z.string()).optional(),
  smsCredits: z.coerce
    .number()
    .int('SMS credits must be a whole number')
    .min(0, 'SMS credits cannot be negative')
    .optional(),
  whatsappCredits: z.coerce
    .number()
    .int('WhatsApp credits must be a whole number')
    .min(0, 'WhatsApp credits cannot be negative')
    .optional(),
  allowFranchises: z.boolean().optional(),
  franchiseEnabled: z.boolean().optional(),
  includedAddons: z.array(z.string()).optional(),
  perFranchiseMonthlyPrice: z.coerce
    .number()
    .min(0, 'Per-franchise monthly price must be 0 or greater')
    .optional(),
  perFranchiseAnnualPrice: z.coerce
    .number()
    .min(0, 'Per-franchise annual price must be 0 or greater')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const upsertAddonPriceSchema = z.object({
  featureKey: z.string().min(1, 'Feature key is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(300).nullable().optional(),
  originalMonthlyPrice: z.coerce.number().min(0).nullable().optional(),
  monthlyPrice: z.coerce.number().min(0, 'Monthly price must be 0 or greater').default(0),
  originalAnnualPrice: z.coerce.number().min(0).nullable().optional(),
  annualPrice: z.coerce.number().min(0, 'Annual price must be 0 or greater').default(0),
  billingType: z.enum(['RECURRING', 'PER_EVENT', 'CREDIT_PACK']).default('RECURRING'),
  creditsIncluded: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type UpsertAddonPriceInput = z.infer<typeof upsertAddonPriceSchema>;
