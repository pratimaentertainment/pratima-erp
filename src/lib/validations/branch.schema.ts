import { z } from 'zod';

export const branchSchema = z.object({
  code: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Branch name is required').max(100),
  shortName: z.string().max(50).optional().nullable(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable().or(z.literal('')),
  gstNumber: z.string().max(20).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().max(20).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  managerUserId: z.string().uuid().optional().nullable(),
  isHeadOffice: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type BranchCreateInput = z.infer<typeof branchSchema>;
export type BranchUpdateInput = Partial<BranchCreateInput>;
