import { z } from 'zod';
import { Priority } from '@prisma/client';

export const inquiryIdSchema = z.string().uuid('Invalid Inquiry ID format');

export const createInquirySchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().min(5, 'Phone number must be at least 5 digits').trim(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  whatsapp: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  inquiryDate: z.coerce.date().default(() => new Date()),
  eventDate: z.coerce
    .date()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  eventType: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  preferredContactTime: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  budgetRange: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  leadSourceId: z
    .string()
    .uuid('Invalid Lead Source ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  assignedToId: z
    .string()
    .uuid('Invalid Assigned User ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  notes: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export const updateInquirySchema = createInquirySchema.partial();

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
