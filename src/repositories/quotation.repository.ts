import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class QuotationRepository {
  static async createQuotation(tx: Prisma.TransactionClient, data: Prisma.QuotationCreateInput) {
    return tx.quotation.create({ data });
  }

  static async createRevision(tx: Prisma.TransactionClient, data: Prisma.QuotationRevisionCreateInput) {
    return tx.quotationRevision.create({ data });
  }

  static async findById(id: string, tenantId?: string, branchId?: string | null) {
    const include = {
      lead: {
        include: {
          customer: true,
          assignedTo: true,
          tenant: true,
          branch: true,
          inquiry: true,
        }
      },
      quotationRevisions: {
        where: {
          ...(tenantId ? { tenantId } : {}),
          deletedAt: null,
        },
        orderBy: { revisionNumber: 'desc' as const },
        include: {
          items: {
            include: {
              package: {
                include: {
                  taxRate: true,
                  items: true,
                  deliverables: true,
                }
              },
              quotationFunction: true,
            }
          },
          createdBy: true,
          tenant: true,
          branch: true,
        }
      },
      subjects: true,
      functions: true,
      deliverables: true,
    };

    if (tenantId && branchId) {
      const quote = await prisma.quotation.findFirst({
        where: { id, lead: { tenantId, branchId } },
        include,
      });
      if (quote) return quote;
    }

    return prisma.quotation.findFirst({
      where: {
        id,
        ...(tenantId ? { lead: { tenantId } } : {}),
      },
      include,
    });
  }

  static async findAll(tenantId?: string, branchId?: string | null, filters?: any) {
    const where: any = {};
    if (tenantId) {
      where.lead = {
        tenantId,
        ...(branchId ? { branchId } : {}),
      };
    }
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.status) where.status = filters.status;

    return prisma.quotation.findMany({
      where,
      include: {
        lead: {
          include: {
            customer: true,
            assignedTo: true,
            tenant: true,
            branch: true,
            inquiry: true,
          }
        },
        quotationRevisions: {
          where: {
            ...(tenantId ? { tenantId } : {}),
            deletedAt: null,
          },
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            items: {
              include: {
                package: true,
              }
            },
            createdBy: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  static async count(tenantId?: string, branchId?: string | null, filters?: any) {
    const where: any = {};
    if (tenantId) {
      where.lead = {
        tenantId,
        ...(branchId ? { branchId } : {}),
      };
    }
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.status) where.status = filters.status;

    return prisma.quotation.count({ where });
  }

  static async findLatestRevision(quotationId: string, tenantId?: string, branchId?: string | null) {
    return prisma.quotationRevision.findFirst({
      where: {
        quotationId,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null,
      },
      orderBy: { revisionNumber: 'desc' },
      include: {
        items: true,
      }
    });
  }

  static async findRevisionById(revisionId: string, tenantId?: string, branchId?: string | null) {
    return prisma.quotationRevision.findFirst({
      where: {
        id: revisionId,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            package: true,
          }
        },
        quotation: {
          include: {
            lead: true,
          }
        }
      }
    });
  }

  static async updateQuotation(tx: Prisma.TransactionClient, quotationId: string, data: any) {
    return tx.quotation.update({
      where: { id: quotationId },
      data,
    });
  }

  static async updateRevision(tx: Prisma.TransactionClient, revisionId: string, tenantId: string, branchId: string | null, data: any) {
    return tx.quotationRevision.update({
      where: { id: revisionId },
      data,
    });
  }
}