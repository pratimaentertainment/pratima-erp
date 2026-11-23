import { z } from 'zod';
import { Priority, LeadStatus } from '@prisma/client';

export const leadIdSchema = z.string().uuid('Invalid Lead ID format');

export const createLeadSchema = z.object({
  packageId: z
    .string()
    .uuid('Invalid Package ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  expectedRevenue: z.coerce
    .number()
    .nonnegative('Expected revenue cannot be negative')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  expectedBookingDate: z.coerce
    .date()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  notes: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedRevenue: z.coerce
    .number()
    .nonnegative('Expected revenue cannot be negative')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  expectedBookingDate: z.coerce
    .date()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  packageId: z
    .string()
    .uuid('Invalid Package ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  assignedToId: z
    .string()
    .uuid('Invalid Assigned User ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  lostReason: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  notes: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export const confirmBookingSchema = z.object({
  leadId: z.string().uuid('Invalid Lead ID format'),
  notes: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
