import { z } from 'zod';

/**
 * Zod validation schema for Guest Lead capture form.
 * Enforces Indian mobile formatting and validates selfie attachment.
 */
export const guestLeadSchema = z.object({
  bookingId: z
    .string()
    .optional()
    .or(z.literal('')),
  guestName: z
    .string()
    .trim()
    .min(2, 'Please enter your full name (at least 2 characters)')
    .max(80, 'Name must not exceed 80 characters'),
  whatsappNumber: z
    .string()
    .trim()
    .min(10, 'WhatsApp number is required')
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      // Validates Indian numbers: 10 digits starting with 6-9, or prefixed with 0 or 91
      return (
        (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
        (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) ||
        (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2)))
      );
    }, 'Please enter a valid 10-digit Indian WhatsApp mobile number (e.g. 9876543210)'),
  selfieImage: z
    .string()
    .min(10, 'Selfie photo is required for AI face matching'),
});

export type GuestLeadFormValues = z.infer<typeof guestLeadSchema>;
