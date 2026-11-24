'use server';

import { auth } from '@/auth';
import { BranchService } from '@/services/branch.service';
import { BranchRepository } from '@/repositories/branch.repository';
import { branchSchema } from '@/lib/validations/branch.schema';
import { revalidatePath } from 'next/cache';
import { switchBranchAction } from '@/actions/context.actions';

export { switchBranchAction as switchActiveBranchAction };

export async function getBranchesAction() {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    const branches = await BranchRepository.findBranchesByTenant((session.user as any).tenantId);
    return { success: true, data: branches };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load branches' };
  }
}

export async function createBranchAction(formData: any) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId || !session.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const validatedData = branchSchema.parse(formData);
    const branch = await BranchService.createBranch((session.user as any).tenantId, session.user.id, validatedData);
    revalidatePath('/dashboard/settings/branches');
    revalidatePath('/settings/branches');
    return { success: true, data: branch };
  } catch (error: any) {
    if (error.code === 'PLAN_LIMIT_EXCEEDED') {
      return {
        success: false,
        error: error.message,
        code: 'PLAN_LIMIT_EXCEEDED',
        limit: error.limit,
        currentUsage: error.currentUsage,
      };
    }
    return { success: false, error: error.message || 'Validation failed' };
  }
}

export async function updateBranchAction(branchId: string, formData: any) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId || !session.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const validatedData = branchSchema.parse(formData);
    const branch = await BranchService.updateBranch((session.user as any).tenantId, branchId, session.user.id, validatedData);
    revalidatePath('/dashboard/settings/branches');
    revalidatePath('/settings/branches');
    return { success: true, data: branch };
  } catch (error: any) {
    return { success: false, error: error.message || 'Validation failed' };
  }
}

export async function toggleBranchStatusAction(branchId: string, isActive: boolean) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId || !session.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const branch = await BranchService.toggleBranchStatus((session.user as any).tenantId, branchId, session.user.id, isActive);
    revalidatePath('/dashboard/settings/branches');
    revalidatePath('/settings/branches');
    return { success: true, data: branch };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle branch status' };
  }
}
