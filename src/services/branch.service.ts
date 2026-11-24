import { BranchRepository } from '@/repositories/branch.repository';
import { BranchCreateInput, BranchUpdateInput } from '@/lib/validations/branch.schema';
import { prisma } from '@/lib/prisma';
import { assertBranchQuota } from '@/services/billing/entitlement.service';

export class BranchService {
  static async createBranch(tenantId: string, userId: string, data: BranchCreateInput) {
    // 1. Enforce SaaS Plan Branch Quota
    await assertBranchQuota(tenantId);

    return prisma.$transaction(async (tx) => {
      // Check Head Office logic
      if (data.isHeadOffice) {
        await tx.branch.updateMany({
          where: { tenantId, isHeadOffice: true },
          data: { isHeadOffice: false }
        });
      }

      const newBranch = await tx.branch.create({
        data: {
          ...data,
          tenantId
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'BRANCH_CREATED',
          entityType: 'Branch',
          entityId: newBranch.id,
          newValues: newBranch as any,
        }
      });

      return newBranch;
    });
  }

  static async updateBranch(tenantId: string, branchId: string, userId: string, data: BranchUpdateInput) {
    return prisma.$transaction(async (tx) => {
      const oldBranch = await tx.branch.findUnique({ where: { id: branchId, tenantId } });
      if (!oldBranch) throw new Error('Branch not found');

      // Check Head Office logic
      if (data.isHeadOffice && !oldBranch.isHeadOffice) {
        await tx.branch.updateMany({
          where: { tenantId, isHeadOffice: true },
          data: { isHeadOffice: false }
        });
      }

      const newBranch = await tx.branch.update({
        where: { id: branchId, tenantId },
        data,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'BRANCH_UPDATED',
          entityType: 'Branch',
          entityId: newBranch.id,
          oldValues: oldBranch as any,
          newValues: newBranch as any,
        }
      });

      return newBranch;
    });
  }

  static async toggleBranchStatus(tenantId: string, branchId: string, userId: string, isActive: boolean) {
    return prisma.$transaction(async (tx) => {
      const newBranch = await tx.branch.update({
        where: { id: branchId, tenantId },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: isActive ? 'BRANCH_ACTIVATED' : 'BRANCH_DEACTIVATED',
          entityType: 'Branch',
          entityId: newBranch.id,
        }
      });

      return newBranch;
    });
  }
}
