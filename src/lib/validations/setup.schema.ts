import { z } from 'zod';

export const setupSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  branchName: z.string().min(2, 'Branch name is required').default('Headquarters'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Valid email is required'),
  mobileNumber: z.string().min(5, 'Valid mobile number is required'),
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  currency: z.string().min(1, 'Currency is required').default('USD'),
  country: z.string().min(1, 'Country is required').default('US'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type SetupInput = z.infer<typeof setupSchema>;
