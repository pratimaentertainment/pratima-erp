import { z } from 'zod';

export const publicSignupSchema = z.object({
  studioName: z
    .string()
    .trim()
    .min(3, 'Studio name must be at least 3 characters')
    .max(100, 'Studio name must not exceed 100 characters'),
  ownerName: z
    .string()
    .trim()
    .min(2, 'Owner name must be at least 2 characters')
    .max(70, 'Owner name must not exceed 70 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number (e.g., 9876543210)'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  planId: z
    .string()
    .trim()
    .optional()
    .nullable(),
  billingCycle: z
    .enum(['MONTHLY', 'ANNUAL', 'LIFETIME'])
    .optional()
    .default('MONTHLY'),
  termsAccepted: z.literal(true, {
    message: 'You must accept the Terms & Conditions to proceed.',
  }),
});

export type PublicSignupInput = z.infer<typeof publicSignupSchema>;
