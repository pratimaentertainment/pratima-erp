import { z } from 'zod';

export const createFranchiseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Franchise studio name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  ownerName: z
    .string()
    .trim()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name cannot exceed 100 characters'),
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Valid email address is required'),
  ownerPhone: z
    .string()
    .trim()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone must not exceed 15 digits'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters'),
  address: z.string().trim().optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
  royaltyPercent: z.coerce
    .number()
    .min(0, 'Royalty cannot be negative')
    .max(100, 'Royalty cannot exceed 100%')
    .default(10),
});

export type CreateFranchiseInput = z.infer<typeof createFranchiseSchema>;

export const transferLeadSchema = z.object({
  leadId: z.string().uuid('Invalid Lead ID'),
  targetFranchiseeId: z.string().uuid('Invalid Target Franchisee ID'),
  notes: z.string().trim().optional().nullable(),
});

export type TransferLeadInput = z.infer<typeof transferLeadSchema>;

export const settleRoyaltySchema = z.object({
  ledgerId: z.string().uuid('Invalid Ledger ID'),
  settlementRef: z
    .string()
    .trim()
    .min(2, 'Settlement reference / UTR / Cheque number is required'),
  notes: z.string().trim().optional().nullable(),
});

export type SettleRoyaltyInput = z.infer<typeof settleRoyaltySchema>;
