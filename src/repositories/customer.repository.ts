import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class CustomerRepository {
  static async findAll(tenantId: string, branchId?: string | null, includeUnconfirmed = false) {
    return prisma.customer.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
        ...(!includeUnconfirmed ? { isConfirmed: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        city: true,
        state: true
      }
    });
  }

  static async findById(tenantId: string, id: string) {
    return prisma.customer.findUnique({
      where: { id, tenantId, deletedAt: null },
      include: {
        city: true,
        state: true
      }
    });
  }

  // Uses transactions for number generation safely
  static async create(tx: Prisma.TransactionClient, data: Prisma.CustomerUncheckedCreateInput) {
    return tx.customer.create({
      data,
      include: {
        city: true,
        state: true
      }
    });
  }

  static async update(tenantId: string, id: string, data: Prisma.CustomerUncheckedUpdateInput) {
    return prisma.customer.update({
      where: { id, tenantId },
      data,
      include: {
        city: true,
        state: true
      }
    });
  }

  static async softDelete(tenantId: string, id: string, deletedById: string) {
    return prisma.customer.update({
      where: { id, tenantId },
      data: { 
        deletedAt: new Date(),
        deletedById
      }
    });
  }
}
