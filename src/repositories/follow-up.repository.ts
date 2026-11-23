import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class FollowUpRepository {
  static async findAll(tenantId: string, branchId: string, filters?: any) {
    const where: Prisma.FollowUpWhereInput = {
      tenantId,
      branchId,
      deletedAt: null,
      ...filters,
    };
    return prisma.followUp.findMany({
      where,
      include: {
        lead: {
          include: { customer: true }
        },
        assignedTo: true,
      },
      orderBy: { followUpDate: 'asc' },
    });
  }

  static async findPending(tenantId: string, branchId: string, filters?: any) {
    const where: Prisma.FollowUpWhereInput = {
      tenantId,
      branchId,
      status: 'PENDING',
      deletedAt: null,
      ...filters,
    };
    return prisma.followUp.findMany({
      where,
      include: {
        lead: {
          include: { customer: true }
        },
        assignedTo: true,
      },
      orderBy: { followUpDate: 'asc' },
    });
  }

  static async findByLeadId(tenantId: string, leadId: string) {
    return prisma.followUp.findMany({
      where: { tenantId, leadId, deletedAt: null },
      include: { assignedTo: true },
      orderBy: { followUpDate: 'desc' },
    });
  }

  static async findById(tenantId: string, id: string) {
    return prisma.followUp.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        lead: true,
        assignedTo: true,
      }
    });
  }

  static async create(tx: Prisma.TransactionClient, data: Prisma.FollowUpUncheckedCreateInput) {
    return tx.followUp.create({ data });
  }

  static async update(tx: Prisma.TransactionClient, id: string, tenantId: string, data: Prisma.FollowUpUncheckedUpdateInput) {
    return tx.followUp.update({
      where: { id },
      data,
    });
  }

  static async softDelete(tx: Prisma.TransactionClient, tenantId: string, id: string, deletedById: string) {
    return tx.followUp.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById,
      },
    });
  }
}
