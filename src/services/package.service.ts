import { prisma } from '@/lib/prisma';
import { PackageRepository } from '@/repositories/package.repository';
import { RoleService } from './role.service';
import { NumberSeriesService } from './number-series.service';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const packageItemSchema = z.object({
  serviceComponentId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  priceOverride: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  categoryId: z.string().uuid(),
  taxRateId: z.string().uuid().optional().nullable(),
  basePrice: z.number().min(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  items: z.array(packageItemSchema).min(1, 'At least one item is required'),
}).refine(data => {
  const componentIds = data.items.map(i => i.serviceComponentId);
  return new Set(componentIds).size === componentIds.length;
}, {
  message: 'Duplicate service components are not allowed in the same package',
  path: ['items']
});

const updatePackageSchema = createPackageSchema;

export class PackageService {
  private static validateSession(session: any) {
    if (!session) {
      throw new Error('Unauthorized: No active session');
    }
    const tenantId = session.tenantId || session.user?.tenantId;
    const branchId = session.branchId !== undefined ? session.branchId : (session.user?.branchId || session.user?.activeBranchId || null);
    const userId = session.userId || session.user?.id;
    if (!tenantId || !userId) {
      throw new Error('Unauthorized: Missing tenant or user information');
    }
    return { tenantId, branchId, userId };
  }

  static async logAction(tx: Prisma.TransactionClient, tenantId: string, userId: string, entityId: string, action: string, notes?: string, oldValues?: any, newValues?: any) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'PACKAGE',
        entityId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : Prisma.JsonNull,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : Prisma.JsonNull,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        createdById: userId,
        entityType: 'PACKAGE',
        entityId,
        action,
        notes,
      }
    });
  }

  static async findAll(session: any, options: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
    orderBy?: any;
  } = {}) {
    return this.getPackages(session, options);
  }

  static async getCreateData(session: any) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    if (branchId) {
      await RoleService.hasPermission(userId, 'PACKAGE', 'READ', branchId);
    }

    const [categories, taxRates, serviceComponents] = await Promise.all([
      prisma.packageCategory.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.taxRate.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        orderBy: { percentage: 'asc' },
        select: { id: true, name: true, percentage: true }
      }),
      prisma.serviceComponent.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, description: true }
      })
    ]);

    return {
      categories,
      taxRates,
      serviceComponents
    };
  }

  static async getPackages(session: any, options: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
    orderBy?: any;
  } = {}) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    if (branchId) {
      await RoleService.hasPermission(userId, 'PACKAGE', 'READ', branchId);
    }
    
    return PackageRepository.findAll(tenantId, branchId, options);
  }

  static async getPackage(session: any, id: string) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'READ', branchId);
    
    const pkg = await PackageRepository.findById(tenantId, id);
    if (!pkg) return null;

    // Enhance with calculated totals
    return this.enrichPackageDetails(pkg);
  }

  static async createPackageDirect(
    tenantId: string,
    data: {
      name: string;
      categoryName?: string;
      categoryId?: string | null;
      basePrice: number;
      advancePercentage?: number;
      notes?: string;
      isActive?: boolean;
      branchId?: string | null;
      userId?: string | null;
      deliverables?: Array<{ itemName: string; quantity: number }>;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const packageCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'PACKAGE');

      const pkg = await tx.package.create({
        data: {
          tenantId,
          ...(data.branchId ? { branchId: data.branchId } : {}),
          packageCode,
          name: data.name,
          categoryName: data.categoryName || null,
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          basePrice: new Prisma.Decimal(data.basePrice),
          advancePercentage: data.advancePercentage !== undefined ? Number(data.advancePercentage) : 25,
          notes: data.notes || null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          version: 1,
          isCurrentVersion: true,
          ...(data.userId ? { createdById: data.userId } : {}),
          ...(data.deliverables && data.deliverables.length > 0
            ? {
                deliverables: {
                  create: data.deliverables.map((del) => ({
                    itemName: del.itemName,
                    quantity: Number(del.quantity) || 1,
                  })),
                },
              }
            : {}),
        },
        include: {
          deliverables: true,
          category: true,
        },
      });

      if (data.userId) {
        await this.logAction(tx, tenantId, data.userId, pkg.id, 'PACKAGE_CREATED', `Package ${packageCode} created`, null, pkg);
      }

      return pkg;
    });
  }

  static async createPackage(sessionOrTenantId: any, data: any) {
    let tenantId: string;
    let branchId: string | null = null;
    let userId: string | null = null;

    if (typeof sessionOrTenantId === 'string') {
      tenantId = sessionOrTenantId;
    } else {
      const sessionData = this.validateSession(sessionOrTenantId);
      tenantId = sessionData.tenantId;
      branchId = sessionData.branchId;
      userId = sessionData.userId;
      if (branchId && userId) {
        await RoleService.hasPermission(userId, 'PACKAGE', 'CREATE', branchId);
      }
    }

    // Support package builder with deliverables
    if (data.deliverables !== undefined || (!data.items && data.name)) {
      return this.createPackageDirect(tenantId, {
        name: data.name,
        categoryName: data.categoryName || data.category,
        categoryId: data.categoryId,
        basePrice: Number(data.basePrice || 0),
        advancePercentage: data.advancePercentage !== undefined ? Number(data.advancePercentage) : 25,
        notes: data.notes,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        branchId: branchId || data.branchId || null,
        userId: userId || data.userId || null,
        deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
      });
    }

    const validatedData = createPackageSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      // Validate Service Components
      const componentIds = validatedData.items.map(i => i.serviceComponentId);
      const components = await tx.serviceComponent.findMany({
        where: { tenantId, id: { in: componentIds }, isActive: true, deletedAt: null }
      });
      if (components.length !== componentIds.length) {
        throw new Error('One or more service components are invalid or inactive');
      }

      const packageCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'PACKAGE');

      const createdPackage = await PackageRepository.create(tx, {
        tenant: { connect: { id: tenantId } },
        ...(branchId ? { branch: { connect: { id: branchId } } } : {}),
        packageCode,
        name: validatedData.name,
        category: { connect: { id: validatedData.categoryId } },
        ...(validatedData.taxRateId ? { taxRate: { connect: { id: validatedData.taxRateId } } } : {}),
        basePrice: validatedData.basePrice,
        notes: validatedData.notes,
        isActive: validatedData.isActive,
        version: 1,
        isCurrentVersion: true,
        ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
        items: {
          create: validatedData.items.map(item => ({
            tenantId,
            serviceComponentId: item.serviceComponentId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            priceOverride: item.priceOverride,
            description: item.description,
          }))
        }
      });

      if (userId) {
        await this.logAction(tx, tenantId, userId, createdPackage.id, 'PACKAGE_CREATED', `Package ${packageCode} created`, null, createdPackage);
      }

      return createdPackage;
    });
  }

  static async updatePackage(session: any, id: string, data: z.infer<typeof updatePackageSchema>) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'UPDATE', branchId);

    const validatedData = updatePackageSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.package.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { items: true }
      });

      if (!existing) throw new Error('Package not found');

      const componentIds = validatedData.items.map(i => i.serviceComponentId);
      const components = await tx.serviceComponent.findMany({
        where: { tenantId, id: { in: componentIds }, isActive: true, deletedAt: null }
      });
      if (components.length !== componentIds.length) {
        throw new Error('One or more service components are invalid or inactive');
      }

      // Update package
      const updatedPackage = await tx.package.update({
        where: { id },
        data: {
          name: validatedData.name,
          categoryId: validatedData.categoryId,
          taxRateId: validatedData.taxRateId,
          basePrice: validatedData.basePrice,
          notes: validatedData.notes,
          isActive: validatedData.isActive,
          updatedById: userId,
          items: {
            deleteMany: {}, // Clean slate for simplicity of array update
            create: validatedData.items.map(item => ({
              tenantId,
              serviceComponentId: item.serviceComponentId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              priceOverride: item.priceOverride,
              description: item.description,
            }))
          }
        },
        include: { items: true }
      });

      await this.logAction(tx, tenantId, userId, id, 'PACKAGE_UPDATED', `Package ${existing.packageCode} updated`, existing, updatedPackage);

      return updatedPackage;
    });
  }

  static async clonePackage(session: any, id: string) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'CREATE', branchId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.package.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { items: true, deliverables: true }
      });

      if (!existing) throw new Error('Package not found to clone');

      const packageCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'PACKAGE');

      const clonedPackage = await PackageRepository.create(tx, {
        tenant: { connect: { id: tenantId } },
        ...(branchId ? { branch: { connect: { id: branchId } } } : {}),
        packageCode,
        name: `${existing.name} (Clone)`,
        categoryName: existing.categoryName,
        ...(existing.categoryId ? { category: { connect: { id: existing.categoryId } } } : {}),
        ...(existing.taxRateId ? { taxRate: { connect: { id: existing.taxRateId } } } : {}),
        basePrice: existing.basePrice,
        advancePercentage: existing.advancePercentage,
        notes: existing.notes,
        isActive: existing.isActive,
        version: 1,
        isCurrentVersion: true,
        createdBy: { connect: { id: userId } },
        ...(existing.deliverables && existing.deliverables.length > 0
          ? {
              deliverables: {
                create: existing.deliverables.map((del) => ({
                  itemName: del.itemName,
                  quantity: del.quantity,
                })),
              },
            }
          : {}),
        items: {
          create: existing.items.map(item => ({
            tenantId,
            serviceComponentId: item.serviceComponentId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            priceOverride: item.priceOverride,
            description: item.description,
          }))
        }
      });

      await this.logAction(tx, tenantId, userId, clonedPackage.id, 'PACKAGE_CLONED', `Package cloned from ${existing.packageCode}`, null, clonedPackage);

      return clonedPackage;
    });
  }

  static async deactivatePackage(session: any, id: string) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'UPDATE', branchId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.package.findFirst({ where: { id, tenantId } });
      if (!existing) throw new Error('Package not found');

      const updated = await tx.package.update({
        where: { id },
        data: { isActive: false, updatedById: userId }
      });

      await this.logAction(tx, tenantId, userId, id, 'PACKAGE_DEACTIVATED', 'Package deactivated', existing, updated);
      return updated;
    });
  }
  
  static async activatePackage(session: any, id: string) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'UPDATE', branchId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.package.findFirst({ where: { id, tenantId } });
      if (!existing) throw new Error('Package not found');

      const updated = await tx.package.update({
        where: { id },
        data: { isActive: true, updatedById: userId }
      });

      await this.logAction(tx, tenantId, userId, id, 'PACKAGE_ACTIVATED', 'Package activated', existing, updated);
      return updated;
    });
  }

  static async softDeletePackage(session: any, id: string) {
    const { tenantId, branchId, userId } = this.validateSession(session);
    await RoleService.hasPermission(userId, 'PACKAGE', 'DELETE', branchId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.package.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new Error('Package not found');

      const deleted = await PackageRepository.softDelete(tx, tenantId, id, userId);

      await this.logAction(tx, tenantId, userId, id, 'PACKAGE_DELETED', 'Package deleted', existing, deleted);

      return deleted;
    });
  }

  private static enrichPackageDetails(pkg: any) {
    let subtotal = Number(pkg.basePrice || 0);

    const enrichedItems = (pkg.items || []).map((item: any) => {
      const effectivePrice = item.priceOverride !== null ? Number(item.priceOverride) : Number(item.unitPrice);
      const lineTotal = item.quantity * effectivePrice;
      subtotal += lineTotal;

      return {
        ...item,
        effectivePrice,
        lineTotal
      };
    });

    let taxAmount = 0;
    if (pkg.taxRate && (pkg.taxRate.percentage || pkg.taxRate.rate)) {
      taxAmount = subtotal * (Number(pkg.taxRate.percentage || pkg.taxRate.rate) / 100);
    }

    const totalAmount = subtotal + taxAmount;

    return {
      ...pkg,
      items: enrichedItems,
      totals: {
        subtotal,
        taxAmount,
        totalAmount
      }
    };
  }
}
