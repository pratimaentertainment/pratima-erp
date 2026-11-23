import { z } from 'zod';

const preprocessNumber = (defaultVal: number = 0) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return defaultVal;
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
  }, z.number());

const preprocessOptionalNumber = () =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable().optional());

export const quotationSubjectSchema = z.object({
  id: z.string().optional(),
  role: z.string().min(1, 'Role is required').default('Bride'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  anniversaryDate: z.string().optional().nullable(),
});

export const quotationFunctionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Function name is required'),
  date: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
});

export const quotationDeliverableSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Deliverable name is required'),
  itemType: z.string().default('ALBUM'),
  quantity: preprocessNumber(1).refine((n) => n >= 1, 'Quantity must be at least 1'),
  basePageLimit: preprocessOptionalNumber(),
});

export const quotationItemSchema = z.object({
  id: z.string().optional(),
  packageId: z.string().optional().nullable(),
  quotationFunctionId: z.string().optional().nullable(),
  itemName: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable(),
  quantity: preprocessNumber(1).refine((n) => n >= 1, 'Quantity must be at least 1'),
  unitPrice: preprocessNumber(0).refine((n) => n >= 0, 'Unit price cannot be negative'),
  discountType: z.enum(['PERCENTAGE', 'FIXED', 'NONE']).default('NONE'),
  discountValue: preprocessNumber(0).refine((n) => n >= 0, 'Discount value cannot be negative'),
});

export const quotationFormSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  tenantId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required').default('Photography Quotation'),
  validUntil: z.string().optional().nullable(),
  eventDate: z.string().optional().nullable(),

  subjects: z.array(quotationSubjectSchema).optional().default([]),
  functions: z.array(quotationFunctionSchema).optional().default([]),
  deliverables: z.array(quotationDeliverableSchema).optional().default([]),

  items: z.array(quotationItemSchema).min(1, 'At least one line item is required'),
  pricingMode: z.enum(['ITEMIZED', 'LUMP_SUM']).default('ITEMIZED'),
  lumpSumAmount: preprocessOptionalNumber(),
  discountType: z.enum(['PERCENTAGE', 'FIXED', 'NONE']).default('NONE'),
  discountValue: preprocessNumber(0).refine((n) => n >= 0, 'Discount value cannot be negative'),
  taxRate: preprocessNumber(0).refine((n) => n >= 0 && n <= 100, 'Tax rate must be between 0% and 100%'),
  advanceRequired: preprocessOptionalNumber(),
  termsAndConditions: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
export type QuotationItemFormValues = z.infer<typeof quotationItemSchema>;
export type QuotationSubjectFormValues = z.infer<typeof quotationSubjectSchema>;
export type QuotationFunctionFormValues = z.infer<typeof quotationFunctionSchema>;
export type QuotationDeliverableFormValues = z.infer<typeof quotationDeliverableSchema>;
