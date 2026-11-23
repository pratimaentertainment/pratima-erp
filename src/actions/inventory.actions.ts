'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { EquipmentCategory, AssetStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session found.');
  }

  let branchId = user.activeBranchId || user.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    branchId = branch?.id;
  }

  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
    branchId: branchId as string,
  };
}

const sendToMaintenanceSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  vendorName: z.string().min(2, 'Vendor name is required'),
  issueCategory: z.string().min(2, 'Issue category is required'),
  issueDescription: z.string().optional().nullable(),
  estimatedCost: z.union([z.number().min(0), z.string(), z.null()]).optional(),
  expectedReturnDate: z.union([z.string(), z.date(), z.null()]).optional(),
  notes: z.string().optional().nullable(),
});

export type SendToMaintenanceInput = z.infer<typeof sendToMaintenanceSchema>;

const resolveMaintenanceSchema = z.object({
  maintenanceId: z.string().uuid('Invalid maintenance ID'),
  actualCost: z.union([z.number().min(0), z.string(), z.null()]).optional(),
  notes: z.string().optional().nullable(),
});

export type ResolveMaintenanceInput = z.infer<typeof resolveMaintenanceSchema>;

const createEquipmentAssetSchema = z.object({
  name: z.string().min(2, 'Equipment name must be at least 2 characters'),
  category: z.nativeEnum(EquipmentCategory),
  brand: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  assetTag: z.string().optional().nullable(),
  currentShutterCount: z.number().int().min(0).default(0).optional(),
  bufferHours: z.number().int().min(0).default(4).optional(),
  purchasePrice: z.union([z.number().min(0), z.string(), z.null()]).optional(),
  purchaseDate: z.union([z.string(), z.date(), z.null()]).optional(),
  warrantyExpiryDate: z.union([z.string(), z.date(), z.null()]).optional(),
  notes: z.string().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export type CreateEquipmentAssetInput = z.infer<typeof createEquipmentAssetSchema>;

/**
 * Sends an equipment item to maintenance/servicing and quarantines it from shoot allocation.
 */
export async function sendToMaintenanceAction(input: SendToMaintenanceInput) {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = sendToMaintenanceSchema.parse(input);

    const equipment = await prisma.equipment.findFirst({
      where: { id: validated.equipmentId, tenantId },
    });

    if (!equipment) {
      return { success: false, error: 'Equipment item not found or unauthorized.' };
    }

    if (equipment.status === AssetStatus.IN_USE) {
      return {
        success: false,
        error: 'Cannot quarantine equipment for maintenance while it is actively in use on a shoot.',
      };
    }

    let parsedCost: Prisma.Decimal | null = null;
    if (validated.estimatedCost !== undefined && validated.estimatedCost !== null && validated.estimatedCost !== '') {
      const num = Number(validated.estimatedCost);
      if (!isNaN(num) && num >= 0) {
        parsedCost = new Prisma.Decimal(num);
      }
    }

    let parsedReturnDate: Date | null = null;
    if (validated.expectedReturnDate) {
      parsedReturnDate = new Date(validated.expectedReturnDate);
    }

    const result = await prisma.$transaction(async (tx) => {
      const maintenance = await tx.equipmentMaintenance.create({
        data: {
          tenantId,
          equipmentId: validated.equipmentId,
          vendorName: validated.vendorName.trim(),
          issueCategory: validated.issueCategory.trim(),
          issueDescription: validated.issueDescription?.trim() || null,
          actualCost: parsedCost,
          status: 'OPEN',
          sentDate: new Date(),
          returnDate: parsedReturnDate,
          notes: validated.notes?.trim() || null,
          createdById: userId,
        },
      });

      const updatedEquipment = await tx.equipment.update({
        where: { id: validated.equipmentId },
        data: { status: AssetStatus.MAINTENANCE },
      });

      return { maintenance, updatedEquipment };
    });

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(result),
      message: `Equipment "${equipment.name}" logged into maintenance with ${validated.vendorName}.`,
    };
  } catch (error: any) {
    console.error('[SEND_TO_MAINTENANCE_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to log equipment maintenance.',
    };
  }
}

/**
 * Resolves an open maintenance record, updates final repair cost, and returns equipment to AVAILABLE.
 */
export async function resolveMaintenanceAction(input: ResolveMaintenanceInput) {
  try {
    const { tenantId } = await validateSession();
    const validated = resolveMaintenanceSchema.parse(input);

    const maintenance = await prisma.equipmentMaintenance.findFirst({
      where: { id: validated.maintenanceId, tenantId },
      include: { equipment: true },
    });

    if (!maintenance) {
      return { success: false, error: 'Maintenance record not found or unauthorized.' };
    }

    let parsedCost = maintenance.actualCost;
    if (validated.actualCost !== undefined && validated.actualCost !== null && validated.actualCost !== '') {
      const num = Number(validated.actualCost);
      if (!isNaN(num) && num >= 0) {
        parsedCost = new Prisma.Decimal(num);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedMaintenance = await tx.equipmentMaintenance.update({
        where: { id: validated.maintenanceId },
        data: {
          status: 'RESOLVED',
          returnDate: new Date(),
          actualCost: parsedCost,
          notes: validated.notes?.trim()
            ? `${maintenance.notes ? `${maintenance.notes}\n` : ''}Resolution: ${validated.notes.trim()}`
            : maintenance.notes,
        },
      });

      const updatedEquipment = await tx.equipment.update({
        where: { id: maintenance.equipmentId },
        data: { status: AssetStatus.AVAILABLE },
      });

      return { maintenance: updatedMaintenance, equipment: updatedEquipment };
    });

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(result),
      message: `Maintenance resolved. "${maintenance.equipment.name}" returned to Available status.`,
    };
  } catch (error: any) {
    console.error('[RESOLVE_MAINTENANCE_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to resolve maintenance.',
    };
  }
}

/**
 * Registers a new equipment item with enterprise QR asset tag and optional purchase financials.
 */
export async function createEquipmentAssetAction(input: CreateEquipmentAssetInput) {
  try {
    const { tenantId, branchId } = await validateSession();
    const validated = createEquipmentAssetSchema.parse(input);

    const effectiveBranchId = validated.branchId || branchId;
    if (!effectiveBranchId) {
      return { success: false, error: 'Branch is required to register equipment.' };
    }

    // Auto-generate tag if not provided
    const cleanAssetTag = validated.assetTag?.trim()
      ? validated.assetTag.trim().toUpperCase()
      : `EQ-${validated.category.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Verify tag uniqueness if provided
    const existingTag = await prisma.equipment.findFirst({
      where: { assetTag: cleanAssetTag, tenantId },
    });
    if (existingTag) {
      return { success: false, error: `Asset tag "${cleanAssetTag}" is already assigned to another item.` };
    }

    let parsedPrice: Prisma.Decimal | null = null;
    if (validated.purchasePrice !== undefined && validated.purchasePrice !== null && validated.purchasePrice !== '') {
      const num = Number(validated.purchasePrice);
      if (!isNaN(num) && num >= 0) {
        parsedPrice = new Prisma.Decimal(num);
      }
    }

    const equipment = await prisma.equipment.create({
      data: {
        tenantId,
        branchId: effectiveBranchId,
        name: validated.name.trim(),
        category: validated.category,
        serialNumber: validated.serialNumber?.trim() || null,
        assetTag: cleanAssetTag,
        brand: validated.brand?.trim() || null,
        modelNumber: validated.modelNumber?.trim() || null,
        status: AssetStatus.AVAILABLE,
        currentShutterCount: validated.currentShutterCount || 0,
        bufferHours: validated.bufferHours || 4,
        purchasePrice: parsedPrice,
        purchaseDate: validated.purchaseDate ? new Date(validated.purchaseDate) : null,
        warrantyExpiryDate: validated.warrantyExpiryDate ? new Date(validated.warrantyExpiryDate) : null,
        notes: validated.notes?.trim() || null,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(equipment),
      message: `Equipment "${equipment.name}" registered with Asset Tag "${cleanAssetTag}".`,
    };
  } catch (error: any) {
    console.error('[CREATE_EQUIPMENT_ASSET_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to register equipment item.',
    };
  }
}

/**
 * Toggles the Advanced QR Inventory mode on or off for the studio tenant.
 */
export async function toggleAdvancedInventoryAction(enabled: boolean) {
  try {
    const { tenantId } = await validateSession();

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { isAdvancedInventoryEnabled: enabled },
      select: { id: true, isAdvancedInventoryEnabled: true },
    });

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/dispatch');

    return {
      success: true,
      isAdvancedInventoryEnabled: updated.isAdvancedInventoryEnabled,
      message: `Advanced QR Inventory Mode is now ${enabled ? 'ENABLED' : 'DISABLED'}.`,
    };
  } catch (error: any) {
    console.error('[TOGGLE_ADVANCED_INVENTORY_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to update inventory configuration.',
    };
  }
}
