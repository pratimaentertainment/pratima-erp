import { z } from 'zod';

export const customerIdSchema = z.string().uuid('Invalid Customer ID format');

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().min(5, 'Phone number must be at least 5 digits').trim(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  stateId: z
    .string()
    .uuid('Invalid State ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  cityId: z
    .string()
    .uuid('Invalid City ID format')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
