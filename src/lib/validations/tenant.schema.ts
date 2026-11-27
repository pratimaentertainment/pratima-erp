import { z } from 'zod';

export const bankDetailsSchema = z.object({
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  ifscCode: z.string().optional().nullable().or(z.literal('')),
  accountHolderName: z.string().optional().nullable().or(z.literal('')),
  accountType: z.string().optional().nullable().or(z.literal('')),
  upiId: z.string().optional().nullable().or(z.literal('')),
  qrCodeUrl: z.string().optional().nullable().or(z.literal('')),
}).optional().nullable();

export const tenantUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  companyLegalName: z.string().max(100).optional().nullable(),
  tradeName: z.string().max(100).optional().nullable(),
  logoUrl: z.string().optional().nullable().or(z.literal('')),
  gstNumber: z.string().max(20).optional().nullable(),
  panNumber: z.string().max(20).optional().nullable(),
  cinNumber: z.string().max(30).optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable().or(z.literal('')),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  country: z.string().min(1, 'Country is required'),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  language: z.string().min(1, 'Language is required'),
  fiscalYearStartMonth: z.coerce.number().min(1).max(12),
  gmbPlaceId: z.string().max(1000).optional().nullable().or(z.literal('')),
  bankDetails: bankDetailsSchema,
  isActive: z.boolean().default(true),
});

export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
