import { z } from 'zod';

export const tenantUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  companyLegalName: z.string().max(100).optional().nullable(),
  tradeName: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable().or(z.literal('')),
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
  isActive: z.boolean().default(true),
});

export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
