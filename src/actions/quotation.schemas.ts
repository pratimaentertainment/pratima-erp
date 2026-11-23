import { z } from 'zod';

export const QuotationSubjectSchema = z.object({
  id: z.string().optional(),
  role: z.string().min(1, 'Role is required').default('Bride'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  birthDate: z.union([z.date(), z.string()]).optional().nullable(),
  anniversaryDate: z.union([z.date(), z.string()]).optional().nullable(),
});

export const QuotationFunctionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Function name is required'),
  date: z.union([z.date(), z.string()]).optional().nullable(),
  venue: z.string().optional().nullable(),
});

export const QuotationDeliverableSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Deliverable name is required'),
  itemType: z.string().default('ALBUM'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  basePageLimit: z.number().int().optional().nullable(),
});

export const QuotationItemSchema = z.object({
  id: z.string().optional(),
  packageId: z.string().optional().nullable(),
  quotationFunctionId: z.string().optional().nullable(),
  itemName: z.string().optional().default('Photography Service'),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.number().min(0, 'Unit price cannot be negative').default(0),
  discountType: z.enum(['PERCENTAGE', 'FIXED', 'NONE']).optional(),
  discountValue: z.number().min(0).optional(),
  itemDiscountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'FIXED']).optional(),
  itemDiscountValue: z.number().min(0).optional(),
  lineItemType: z.enum(['STANDARD', 'OPTIONAL', 'INFORMATION']).optional(),
});

export const QuotationDiscountSchema = z.object({
  discountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'FIXED']),
  discountValue: z.number().min(0).optional(),
  couponCode: z.string().optional(),
});

export const GetQuotationSchema = z.object({
  id: z.string().min(1, 'Invalid quotation ID'),
});

export const CreateQuotationSchema = z.object({
  leadId: z.string().min(1, 'Invalid lead ID'),
  tenantId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  title: z.string().optional(),
  validUntil: z.union([z.date(), z.string()]).optional().nullable(),
  eventDate: z.union([z.date(), z.string()]).optional().nullable(),
  currencyCode: z.string().min(3).max(3).optional(),

  // Advanced Hybrid Quotation entities
  subjects: z.array(QuotationSubjectSchema).optional().default([]),
  functions: z.array(QuotationFunctionSchema).optional().default([]),
  deliverables: z.array(QuotationDeliverableSchema).optional().default([]),

  items: z.array(QuotationItemSchema).min(1, 'At least one item is required'),
  pricingMode: z.enum(['ITEMIZED', 'LUMP_SUM']).optional().default('ITEMIZED'),
  lumpSumAmount: z.number().optional().nullable(),
  discount: QuotationDiscountSchema.optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED', 'NONE']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  advanceRequired: z.number().min(0).optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  grandTotal: z.number().optional(),
});

export const UpdateRevisionDraftSchema = z.object({
  revisionId: z.string().min(1, 'Invalid revision ID'),
  revisionReason: z.string().optional(),
  revisionComment: z.string().optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  validUntil: z.coerce.date().optional(),
  pricingMode: z.enum(['ITEMIZED', 'LUMP_SUM']).optional(),
  lumpSumAmount: z.number().optional().nullable(),
  subjects: z.array(QuotationSubjectSchema).optional(),
  functions: z.array(QuotationFunctionSchema).optional(),
  deliverables: z.array(QuotationDeliverableSchema).optional(),
  items: z.array(QuotationItemSchema).optional(),
  discount: QuotationDiscountSchema.optional(),
  updatedAt: z.coerce.date().optional(),
});

export const CreateRevisionSchema = z.object({
  quotationId: z.string().min(1, 'Invalid quotation ID'),
  revisionReason: z.string().optional(),
  revisionComment: z.string().optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  pricingMode: z.enum(['ITEMIZED', 'LUMP_SUM']).optional(),
  lumpSumAmount: z.number().optional().nullable(),
  subjects: z.array(QuotationSubjectSchema).optional(),
  functions: z.array(QuotationFunctionSchema).optional(),
  deliverables: z.array(QuotationDeliverableSchema).optional(),
  items: z.array(QuotationItemSchema).optional(),
  discount: QuotationDiscountSchema.optional(),
});

export const ChangeQuotationStatusSchema = z.object({
  quotationId: z.string().uuid('Invalid quotation ID'),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'CONVERTED', 'EXPIRED']),
  reason: z.string().optional(),
});
