'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function switchBranchAction(branchId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id!;
    const tenantId = (session.user as any).tenantId;

    if (!tenantId) {
      return { success: false, error: 'No active tenant found in session' };
    }

    // Fetch user and determine owner/admin privileges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const roleNames = user?.roles?.map((r) => r.role.name) || [];
    const isOwnerOrAdmin =
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'TENANT_OWNER' ||
      roleNames.includes('SUPER_ADMIN') ||
      roleNames.includes('TENANT_OWNER') ||
      roleNames.includes('Studio Owner') ||
      roleNames.includes('Owner') ||
      roleNames.includes('Admin');

    // Handle "ALL" mode (Consolidated Studio View)
    if (branchId === 'ALL') {
      if (!isOwnerOrAdmin) {
        return {
          success: false,
          error: 'Access denied: Only Studio Owners and Administrators can view All Branches.',
        };
      }

      const cookieStore = await cookies();
      cookieStore.set('pratima_active_branch_id', 'ALL', {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        sameSite: 'lax',
      });

      revalidatePath('/', 'layout');

      return {
        success: true,
        branchId: 'ALL',
        branchName: 'All Branches (Consolidated)',
        isAllBranches: true,
      };
    }

    // Verify branch belongs to active tenant and is active
    const targetBranch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetBranch) {
      return { success: false, error: 'Target branch does not exist or is inactive' };
    }

    if (!isOwnerOrAdmin) {
      const isAssigned = await prisma.userBranch.findFirst({
        where: {
          userId,
          branchId,
          isActive: true,
        },
      });

      if (!isAssigned) {
        return {
          success: false,
          error: 'Access denied: You are not assigned to this branch.',
        };
      }
    }

    // Store branch selection in cookie for persistent context across all requests
    const cookieStore = await cookies();
    cookieStore.set('pratima_active_branch_id', targetBranch.id, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    revalidatePath('/', 'layout');

    return {
      success: true,
      branchId: targetBranch.id,
      branchName: targetBranch.name,
      isAllBranches: false,
    };
  } catch (error: any) {
    console.error('Error switching branch:', error);
    return { success: false, error: error.message || 'Failed to switch branch' };
  }
}

export async function getSwitcherContextAction() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id!;
    const tenantId = (session.user as any).tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const branches = await prisma.userBranch.findMany({
      where: { userId, isActive: true, branch: { tenantId } },
      include: { branch: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: {
        tenantName: tenant?.name || 'Unknown Tenant',
        branches: branches.map((b: any) => ({
          id: b.branch.id,
          name: b.branch.name,
          isPrimary: b.isPrimary,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
