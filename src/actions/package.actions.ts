'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { NumberSeriesService } from '@/services/number-series.service';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PackageService } from '@/services/package.service';
import {
  packageIdSchema,
  createPackagePayloadSchema,
  updatePackagePayloadSchema,
  saveQuotationAsPackageSchema,
} from '@/schemas/package.schema';

export interface QuotationItemForPackage {
  itemName: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  serviceComponentId?: string | null;
}

export interface SaveQuotationAsPackageInput {
  name: string;
  description?: string | null;
  items: QuotationItemForPackage[];
  tenantId?: string;
  basePrice?: number;
}

/**
 * Retrieves active packages with nested items, deliverables, and service components for a tenant.
 */
export async function getActivePackagesWithItemsAction(tenantId?: string) {
  try {
    if (tenantId) {
      z.string().uuid('Invalid tenant ID format').parse(tenantId);
    }
    const session = await auth();
    const effectiveTenantId = tenantId || (session?.user as any)?.tenantId;
    if (!effectiveTenantId) return [];

    const packages = await prisma.package.findMany({
      where: {
        tenantId: effectiveTenantId,
        isActive: true,
        deletedAt: null,
        isCurrentVersion: true,
      },
      include: {
        items: {
          include: {
            serviceComponent: true,
          },
        },
        deliverables: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializePrisma(packages);
  } catch (error: any) {
    console.error('Failed to fetch active packages with items:', error);
    return [];
  }
}

/**
 * Creates a new Package template directly from quotation line items.
 * Maps quotation items to PackageItem records (creating ServiceComponents if necessary)
 * and PackageDeliverables, preserving full enterprise referential integrity.
 */
export async function saveQuotationAsPackageAction(input: SaveQuotationAsPackageInput): Promise<{
  success: boolean;
  package?: any;
  error?: string;
}> {
  try {
    const validatedInput = saveQuotationAsPackageSchema.parse(input);
    const session = await auth();
    const sessionTenantId = (session?.user as any)?.tenantId;
    const targetTenantId = input.tenantId || sessionTenantId;

    if (!targetTenantId) {
      return { success: false, error: 'Unauthorized: Missing tenant ID' };
    }

    const userId = (session?.user as any)?.id || null;

    if (!input.name || !input.name.trim()) {
      return { success: false, error: 'Package name is required.' };
    }

    const validItems = (input.items || []).filter(
      (item) => item && typeof item.itemName === 'string' && item.itemName.trim().length > 0
    );

    if (validItems.length === 0) {
      return { success: false, error: 'At least one valid line item is required to create a package.' };
    }

    const calculatedBasePrice =
      input.basePrice !== undefined && input.basePrice !== null
        ? Number(input.basePrice)
        : validItems.reduce((acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduplicate/group items by itemName to avoid unique constraint violations on (packageId, serviceComponentId)
      const componentMap = new Map<
        string,
        {
          name: string;
          description: string | null;
          quantity: number;
          unitPrice: number;
        }
      >();

      for (const it of validItems) {
        const trimmedName = it.itemName.trim();
        const existing = componentMap.get(trimmedName);
        const qty = Math.max(1, Number(it.quantity) || 1);
        const price = Math.max(0, Number(it.unitPrice) || 0);

        if (existing) {
          existing.quantity += qty;
          if (it.description && !existing.description) {
            existing.description = it.description;
          }
        } else {
          componentMap.set(trimmedName, {
            name: trimmedName,
            description: it.description || null,
            quantity: qty,
            unitPrice: price,
          });
        }
      }

      // 2. Ensure each component exists as a ServiceComponent in the tenant
      const packageItemsData: Array<{
        serviceComponentId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        description: string | null;
      }> = [];

      for (const entry of Array.from(componentMap.values())) {
        let serviceComponent = await tx.serviceComponent.findFirst({
          where: {
            tenantId: targetTenantId,
            name: { equals: entry.name, mode: 'insensitive' },
            deletedAt: null,
          },
        });

        if (!serviceComponent) {
          const basePrefix =
            entry.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'SVC';
          let code = `${basePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
          let attempts = 0;
          while (attempts < 5) {
            const collision = await tx.serviceComponent.findUnique({
              where: { tenantId_code: { tenantId: targetTenantId, code } },
            });
            if (!collision) break;
            code = `${basePrefix}-${Math.floor(10000 + Math.random() * 90000)}`;
            attempts++;
          }

          serviceComponent = await tx.serviceComponent.create({
            data: {
              tenantId: targetTenantId,
              name: entry.name,
              code,
              description: entry.description,
              isActive: true,
            },
          });
        }

        packageItemsData.push({
          serviceComponentId: serviceComponent.id,
          quantity: entry.quantity,
          unitPrice: new Prisma.Decimal(entry.unitPrice),
          description: entry.description,
        });
      }

      // 3. Generate sequential Package Code
      const packageCode = await NumberSeriesService.getNextNumber(tx, targetTenantId, 'PACKAGE');

      // 4. Create Package with items and deliverables
      const newPackage = await tx.package.create({
        data: {
          tenantId: targetTenantId,
          packageCode,
          name: input.name.trim(),
          notes: input.description?.trim() || null,
          basePrice: new Prisma.Decimal(calculatedBasePrice),
          advancePercentage: 25,
          isActive: true,
          version: 1,
          isCurrentVersion: true,
          createdById: userId,
          items: {
            create: packageItemsData.map((pi) => ({
              tenantId: targetTenantId,
              serviceComponentId: pi.serviceComponentId,
              quantity: pi.quantity,
              unitPrice: pi.unitPrice,
              description: pi.description,
            })),
          },
          deliverables: {
            create: validItems.map((it) => ({
              itemName: it.itemName.trim(),
              quantity: Math.max(1, Number(it.quantity) || 1),
            })),
          },
        },
        include: {
          items: {
            include: {
              serviceComponent: true,
            },
          },
          deliverables: true,
          category: true,
        },
      });

      // 5. Audit Log
      if (userId) {
        await tx.auditLog.create({
          data: {
            tenantId: targetTenantId,
            userId,
            entityType: 'PACKAGE',
            entityId: newPackage.id,
            action: 'PACKAGE_CREATED',
            newValues: JSON.parse(JSON.stringify(newPackage)),
          },
        });
      }

      return newPackage;
    });

    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    revalidatePath('/quotations');

    return {
      success: true,
      package: serializePrisma(result),
    };
  } catch (error: any) {
    console.error('Failed to save quotation as package:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return {
      success: false,
      error: error.message || 'Failed to save quotation as package.',
    };
  }
}

export async function getPackagesAction(options: any = {}) {
  try {
    const session = await auth();
    const result = await PackageService.getPackages(session, options);
    return serializePrisma(result);
  } catch (error: any) {
    console.error('getPackagesAction error:', error);
    throw new Error(error.message || 'Failed to fetch packages');
  }
}

export async function getPackageAction(id: string) {
  try {
    const validId = packageIdSchema.parse(id);
    const session = await auth();
    const result = await PackageService.getPackage(session, validId);
    return serializePrisma(result);
  } catch (error: any) {
    console.error('getPackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to fetch package');
  }
}

export async function createPackageAction(data: any) {
  try {
    const session = await auth();
    const validated = createPackagePayloadSchema.parse(data);
    const pkg = await PackageService.createPackage(session, validated);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('createPackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new Error(`Database error (${error.code}): ${error.message}`);
    }
    throw new Error(error.message || 'Failed to create package');
  }
}

export async function updatePackageAction(id: string, data: any) {
  try {
    const validId = packageIdSchema.parse(id);
    const validated = updatePackagePayloadSchema.parse(data);
    const session = await auth();
    const pkg = await PackageService.updatePackage(session, validId, validated as any);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    revalidatePath(`/sales/packages/${validId}`);
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('updatePackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new Error(`Database error (${error.code}): ${error.message}`);
    }
    throw new Error(error.message || 'Failed to update package');
  }
}

export async function clonePackageAction(id: string) {
  try {
    const validId = packageIdSchema.parse(id);
    const session = await auth();
    const pkg = await PackageService.clonePackage(session, validId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('clonePackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to clone package');
  }
}

export async function activatePackageAction(id: string) {
  try {
    const validId = packageIdSchema.parse(id);
    const session = await auth();
    const pkg = await PackageService.activatePackage(session, validId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    revalidatePath(`/sales/packages/${validId}`);
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('activatePackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to activate package');
  }
}

export async function deactivatePackageAction(id: string) {
  try {
    const validId = packageIdSchema.parse(id);
    const session = await auth();
    const pkg = await PackageService.deactivatePackage(session, validId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    revalidatePath(`/sales/packages/${validId}`);
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('deactivatePackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to deactivate package');
  }
}

export async function deletePackageAction(id: string) {
  try {
    const validId = packageIdSchema.parse(id);
    const session = await auth();
    const pkg = await PackageService.softDeletePackage(session, validId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return serializePrisma(pkg);
  } catch (error: any) {
    console.error('deletePackageAction error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to delete package');
  }
}
