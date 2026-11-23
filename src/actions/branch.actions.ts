'use server';

import { auth } from '@/auth';
import { BranchService } from '@/services/branch.service';
import { BranchRepository } from '@/repositories/branch.repository';
import { branchSchema } from '@/lib/validations/branch.schema';
import { revalidatePath } from 'next/cache';
import { switchBranchAction } from '@/actions/context.actions';

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
    return { success: true, data: branch };
  } catch (error: any) {
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
    return { success: true, data: branch };
  } catch (error: any) {
    return { success: false, error: error.message || 'Update failed' };
  }
}

/**
 * @deprecated Use switchBranchAction in context.actions.ts instead.
 * Retained for backward-compatibility; delegates directly to switchBranchAction
 * to ensure single-cookie ('pratima_active_branch_id') synchronization.
 */
export async function switchActiveBranchAction(branchId: string) {
  return switchBranchAction(branchId);
}
