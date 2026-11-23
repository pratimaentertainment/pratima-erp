'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUserBranchesAction(userId: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId, branch: { tenantId: (session.user as any).tenantId } },
      include: { branch: true },
      orderBy: { createdAt: 'asc' }
    });
    return { success: true, data: userBranches };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserBranchesMappingAction(userId: string, branchMappings: { branchId: string, isPrimary: boolean, isActive: boolean }[]) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  const tenantId = (session.user as any)?.tenantId;
  const performedBy = session.user?.id;
  if (!tenantId || !performedBy) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.$transaction(async (tx) => {
      // Validate user belongs to tenant
      const targetUser = await tx.user.findUnique({ where: { id: userId, tenantId } });
      if (!targetUser) throw new Error('User not found');

      // Clear existing mappings
      await tx.userBranch.deleteMany({
        where: { userId }
      });

      // Create new mappings with strict tenant branch validation
      if (branchMappings.length > 0) {
        const branchIds = branchMappings.map(bm => bm.branchId);
        const validBranches = await tx.branch.findMany({
          where: { id: { in: branchIds }, tenantId },
          select: { id: true }
        });
        const validSet = new Set(validBranches.map(b => b.id));
        const safeMappings = branchMappings.filter(bm => validSet.has(bm.branchId));

        if (safeMappings.length > 0) {
          await tx.userBranch.createMany({
            data: safeMappings.map(bm => ({
              userId,
              branchId: bm.branchId,
              isPrimary: bm.isPrimary,
              isActive: bm.isActive,
            }))
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'USER_ASSIGNED_TO_BRANCH',
          entityType: 'UserBranch',
          entityId: userId,
          newValues: branchMappings as any,
        }
      });
    });

    revalidatePath(`/dashboard/users/${userId}/branches`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
