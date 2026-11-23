import { z } from 'zod';
import { QUOTATION_STATUSES } from '../constants';

export const QuotationItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
});

export const CreateQuotationSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Title is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(QuotationItemSchema).min(1, 'At least one item is required'),
});

export const UpdateQuotationSchema = CreateQuotationSchema.extend({
  id: z.string().min(1, 'Quotation ID is required'),
});

export const UpdateQuotationStatusSchema = z.object({
  id: z.string().min(1, 'Quotation ID is required'),
  status: z.enum([
    QUOTATION_STATUSES.DRAFT,
    QUOTATION_STATUSES.SENT,
    QUOTATION_STATUSES.VIEWED,
    QUOTATION_STATUSES.NEGOTIATION,
    QUOTATION_STATUSES.APPROVED,
    QUOTATION_STATUSES.REJECTED,
    QUOTATION_STATUSES.EXPIRED,
    QUOTATION_STATUSES.CONVERTED,
  ]),
  notes: z.string().optional(),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;
export type QuotationItemInput = z.infer<typeof QuotationItemSchema>;
