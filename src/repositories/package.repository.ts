import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class PackageRepository {
  static async findAll(
    tenantId: string, 
    branchId: string, 
    options: {
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      skip?: number;
      take?: number;
      orderBy?: any;
    } = {}
  ) {
    const where: Prisma.PackageWhereInput = {
      tenantId,
      deletedAt: null,
      isCurrentVersion: true,
    };

    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { packageCode: { contains: options.search, mode: 'insensitive' } },
            { categoryName: { contains: options.search, mode: 'insensitive' } },
            {
              items: {
                some: {
                  serviceComponent: {
                    name: { contains: options.search, mode: 'insensitive' }
                  }
                }
              }
            },
            {
              category: {
                name: { contains: options.search, mode: 'insensitive' }
              }
            }
          ]
        }
      ];
    }

    const [total, packages] = await Promise.all([
      prisma.package.count({ where }),
      prisma.package.findMany({
        where,
        include: {
          category: true,
          taxRate: true,
          deliverables: true,
          _count: { select: { items: true, deliverables: true } }
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { createdAt: 'desc' },
      })
    ]);

    return { total, packages };
  }

  static async findById(tenantId: string, id: string) {
    return prisma.package.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        category: true,
        taxRate: true,
        deliverables: true,
        items: {
          include: {
            serviceComponent: true
          }
        }
      }
    });
  }

  static async findByCode(tenantId: string, packageCode: string, isCurrentVersion = true) {
    return prisma.package.findFirst({
      where: { tenantId, packageCode, isCurrentVersion, deletedAt: null },
      include: {
        category: true,
        taxRate: true,
        items: {
          include: {
            serviceComponent: true
          }
        }
      }
    });
  }

  static async create(tx: Prisma.TransactionClient, data: Prisma.PackageCreateInput) {
    return tx.package.create({ data });
  }

  static async update(tx: Prisma.TransactionClient, id: string, tenantId: string, data: Prisma.PackageUpdateInput) {
    return tx.package.update({
      where: { id, tenantId },
      data,
    });
  }

  static async softDelete(tx: Prisma.TransactionClient, tenantId: string, id: string, deletedById: string) {
    return tx.package.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        deletedBy: { connect: { id: deletedById } },
        isActive: false
      },
    });
  }
}
