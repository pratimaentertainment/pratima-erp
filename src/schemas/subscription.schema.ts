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
  monthlyPrice: z.coerce
    .number()
    .min(0, 'Monthly price must be 0 or greater'),
  annualPrice: z.coerce
    .number()
    .min(0, 'Annual price must be 0 or greater'),
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
  monthlyPrice: z.coerce
    .number()
    .min(0, 'Monthly price must be 0 or greater'),
  annualPrice: z.coerce
    .number()
    .min(0, 'Annual price must be 0 or greater'),
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
