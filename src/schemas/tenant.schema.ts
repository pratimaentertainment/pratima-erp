import { z } from 'zod';

export const registerStudioSchema = z.object({
  name: z.string().trim().min(2, 'Studio name must be at least 2 characters').max(100, 'Studio name too long'),
  email: z.string().trim().email('Please enter a valid email address'),
  contactPhone: z
    .string()
    .trim()
    .min(10, 'Contact number must be at least 10 digits')
    .max(15, 'Contact number must not exceed 15 digits')
    .regex(/^[0-9+ -]+$/, 'Invalid phone number format'),
  panNumber: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val), {
      message: 'Invalid Indian PAN format (e.g., ABCDE1234F)',
    }),
  accountType: z.enum(['TRIAL', 'INTERNAL_LIFETIME']).default('TRIAL'),
});

export type RegisterStudioInput = z.infer<typeof registerStudioSchema>;
