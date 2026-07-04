import { prisma } from '@/lib/prisma';
import { BranchCreateInput, BranchUpdateInput } from '@/lib/validations/branch.schema';

export class BranchRepository {
  static async findBranchesByTenant(tenantId: string) {
    return prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [
        { isHeadOffice: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  static async findBranchById(tenantId: string, branchId: string) {
    return prisma.branch.findUnique({
      where: { id: branchId, tenantId, deletedAt: null }
    });
  }

  static async createBranch(tenantId: string, data: BranchCreateInput) {
    return prisma.branch.create({
      data: {
        ...data,
        tenantId,
      }
    });
  }

  static async updateBranch(tenantId: string, branchId: string, data: BranchUpdateInput) {
    return prisma.branch.update({
      where: { id: branchId, tenantId },
      data,
    });
  }

  static async clearHeadOfficeFlag(tenantId: string) {
    return prisma.branch.updateMany({
      where: { tenantId, isHeadOffice: true },
      data: { isHeadOffice: false }
    });
  }

  static async getHeadOffice(tenantId: string) {
    return prisma.branch.findFirst({
      where: { tenantId, isHeadOffice: true, deletedAt: null }
    });
  }
}
