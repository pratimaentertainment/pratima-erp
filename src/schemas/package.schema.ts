import { z } from 'zod';

export const packageIdSchema = z.string().uuid('Invalid Package ID format');

export const packageItemInputSchema = z.object({
  serviceComponentId: z.string().uuid('Invalid Service Component ID'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

export const packageDeliverableInputSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').trim(),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1').default(1),
});

export const createPackageItemsSchema = z.object({
  name: z.string().min(1, 'Package name is required').trim(),
  categoryId: z.string().uuid('Invalid Category ID'),
  taxRateId: z.string().uuid('Invalid Tax Rate ID').optional().nullable(),
  basePrice: z.coerce.number().min(0, 'Base price cannot be negative'),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  items: z.array(packageItemInputSchema).min(1, 'At least one item is required'),
});

export const createPackageDirectSchema = z.object({
  name: z.string().min(1, 'Package name is required').trim(),
  categoryName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  basePrice: z.coerce.number().min(0).default(0),
  advancePercentage: z.coerce.number().min(0).max(100).default(25),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  branchId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  deliverables: z.array(packageDeliverableInputSchema).optional().default([]),
});

export const createPackagePayloadSchema = z.union([
  createPackageItemsSchema,
  createPackageDirectSchema,
]);

export const updatePackagePayloadSchema = z.object({
  name: z.string().min(1, 'Package name is required').trim().optional(),
  categoryId: z.string().uuid('Invalid Category ID').optional().nullable(),
  taxRateId: z.string().uuid('Invalid Tax Rate ID').optional().nullable(),
  basePrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(packageItemInputSchema).optional(),
  deliverables: z.array(packageDeliverableInputSchema).optional(),
  advancePercentage: z.coerce.number().min(0).max(100).optional(),
  categoryName: z.string().optional().nullable(),
});

export const quotationItemForPackageSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').trim(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  serviceComponentId: z.string().uuid().optional().nullable(),
});

export const saveQuotationAsPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').trim(),
  description: z.string().optional().nullable(),
  items: z.array(quotationItemForPackageSchema).min(1, 'At least one valid item is required'),
  tenantId: z.string().uuid().optional(),
  basePrice: z.coerce.number().min(0).optional(),
});

export type CreatePackageItemsInput = z.infer<typeof createPackageItemsSchema>;
export type CreatePackageDirectInput = z.infer<typeof createPackageDirectSchema>;
export type SaveQuotationAsPackageSchemaInput = z.infer<typeof saveQuotationAsPackageSchema>;
