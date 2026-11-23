import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class LeadRepository {
  static async findAll(tenantId: string, branchId?: string | null) {
    return prisma.lead.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null
      },
      include: {
        customer: true,
        assignedTo: true,
        package: true,
        inquiry: {
          include: { leadSource: true }
        },
        quotations: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { followUpDate: 'desc' },
          take: 3,
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(tenantId: string, id: string) {
    if (!id) throw new Error("Lead ID is required");

    return prisma.lead.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        customer: true,
        assignedTo: true,
        package: true,
        inquiry: {
          include: { leadSource: true }
        },
        invoices: {
          where: { deletedAt: null },
          include: {
            payments: {
              where: { deletedAt: null },
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: {
            quotationRevisions: {
              where: { deletedAt: null },
              orderBy: { revisionNumber: 'desc' },
              take: 1,
            },
            invoice: {
              include: {
                payments: {
                  where: { deletedAt: null },
                  orderBy: { paymentDate: 'desc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        eventBookings: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }
      }
    });
  }

  static async create(tx: Prisma.TransactionClient, data: any) {
    return tx.lead.create({
      data,
      include: {
        customer: true,
        assignedTo: true,
        package: true,
        inquiry: {
          include: { leadSource: true }
        }
      }
    });
  }

  static async update(tenantId: string, id: string, data: any) {
    return prisma.lead.update({
      where: { id, tenantId },
      data,
      include: {
        customer: true,
        assignedTo: true,
        package: true,
        inquiry: {
          include: { leadSource: true }
        }
      }
    });
  }

  static async softDelete(tenantId: string, id: string, userId: string) {
    return prisma.lead.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        deletedById: userId
      }
    });
  }
}
