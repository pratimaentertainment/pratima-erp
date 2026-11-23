import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class InquiryRepository {
  static async findAll(tenantId: string, branchId?: string | null, includeConverted = false) {
    return prisma.inquiry.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
        ...(!includeConverted ? { status: { not: 'CONVERTED' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        leadSource: true,
        assignedTo: true,
        lead: true,
      }
    });
  }

  static async findById(tenantId: string, id: string) {
    return prisma.inquiry.findUnique({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: true,
        leadSource: true,
        assignedTo: true,
      }
    });
  }

  static async create(tx: Prisma.TransactionClient, data: Prisma.InquiryUncheckedCreateInput) {
    return tx.inquiry.create({
      data,
      include: {
        customer: true,
        leadSource: true,
        assignedTo: true,
        lead: true,
      }
    });
  }

  static async update(tenantId: string, id: string, data: Prisma.InquiryUncheckedUpdateInput) {
    return prisma.inquiry.update({
      where: { id, tenantId },
      data,
      include: {
        customer: true,
        leadSource: true,
        assignedTo: true,
        lead: true,
      }
    });
  }

  static async softDelete(tenantId: string, id: string, deletedById: string) {
    return prisma.inquiry.update({
      where: { id, tenantId },
      data: { 
        deletedAt: new Date(),
        deletedById
      }
    });
  }
}
