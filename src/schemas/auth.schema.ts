import { z } from 'zod';

export const publicSignupSchema = z.object({
  studioName: z
    .string()
    .trim()
    .min(3, 'Studio name must be at least 3 characters')
    .max(100, 'Studio name must not exceed 100 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City / Town must be at least 2 characters (e.g. Kolhapur, Pune)')
    .max(80, 'City / Town must not exceed 80 characters'),
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
  referralCode: z
    .string()
    .trim()
    .optional()
    .nullable(),
  termsAccepted: z.literal(true, {
    message: 'You must accept the Terms & Conditions to proceed.',
  }),
});

export const publicSignupVerifySchema = publicSignupSchema.extend({
  otp: z
    .string()
    .length(6, 'Please enter the 6-digit verification code')
    .regex(/^\d{6}$/, 'Verification code must be numbers only'),
  deviceSeed: z.string().optional(),
});

export type PublicSignupInput = z.infer<typeof publicSignupSchema>;
export type PublicSignupVerifyInput = z.infer<typeof publicSignupVerifySchema>;
