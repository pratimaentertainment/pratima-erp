import { z } from 'zod';

export const createDealerSchema = z.object({
  dealerCode: z
    .string()
    .trim()
    .min(3, 'Dealer code must be at least 3 characters')
    .max(20, 'Dealer code must not exceed 20 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Dealer code must be alphanumeric (e.g. RAJESH10)'),
  businessName: z.string().trim().min(2, 'Business / Agency name is required'),
  contactPerson: z.string().trim().min(2, 'Contact person name is required'),
  email: z.string().trim().email('Valid email address required'),
  phone: z.string().trim().min(10, 'Valid 10-digit phone number required'),
  city: z.string().trim().optional(),
  password: z.string().min(6, 'Temporary password must be at least 6 characters'),
  commissionPercent: z.number().min(0).max(100).default(20),
  firstPaymentDiscountPercent: z.number().min(0).max(100).default(10),
  bankDetails: z.string().trim().optional(),
});

export const updateDealerSchema = z.object({
  dealerId: z.string().min(1, 'Dealer ID is required'),
  businessName: z.string().trim().min(2, 'Business name is required'),
  contactPerson: z.string().trim().min(2, 'Contact person name is required'),
  phone: z.string().trim().min(10, 'Phone is required'),
  city: z.string().trim().optional().nullable(),
  commissionPercent: z.number().min(0).max(100),
  firstPaymentDiscountPercent: z.number().min(0).max(100),
  bankDetails: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const recordDealerPayoutSchema = z.object({
  dealerId: z.string().min(1, 'Dealer ID is required'),
  amount: z.number().min(1, 'Payout amount must be greater than 0'),
  paymentMode: z.enum(['UPI', 'NEFT', 'IMPS', 'BANK_TRANSFER', 'CASH']).default('UPI'),
  transactionRef: z.string().trim().min(2, 'Transaction UTR / Reference number is required'),
  notes: z.string().trim().optional().nullable(),
});

export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>;
export type RecordDealerPayoutInput = z.infer<typeof recordDealerPayoutSchema>;
