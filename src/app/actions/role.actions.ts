'use server';

import { auth } from '@/auth';
import { RoleService } from '@/services/role.service';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createRoleAction(data: { name: string; description?: string }) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    // Audit Log could be fired here for ROLE_CREATED
    const role = await RoleService.createRole((session.user as any).tenantId, data as any);
    revalidatePath('/dashboard/roles');
    return { success: true, data: role };
  } catch (error: unknown) {
    const e = error as Error;
    return { success: false, error: e.message || 'Failed to create role' };
  }
}

export async function updateRoleAction(roleId: string, data: { name: string; description?: string }) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    const role = await RoleService.updateRole((session.user as any).tenantId, roleId, data as any);
    revalidatePath('/dashboard/roles');
    return { success: true, data: role };
  } catch (error: unknown) {
    const e = error as Error;
    return { success: false, error: e.message || 'Failed to update role' };
  }
}

export async function deleteRoleAction(roleId: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    await RoleService.deleteRole((session.user as any).tenantId, roleId);
    revalidatePath('/dashboard/roles');
    return { success: true };
  } catch (error: unknown) {
    const e = error as Error;
    return { success: false, error: e.message || 'Failed to delete role' };
  }
}

export async function cloneRoleAction(sourceRoleId: string, newName: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    const role = await RoleService.cloneRole((session.user as any).tenantId, sourceRoleId, newName);
    revalidatePath('/dashboard/roles');
    return { success: true, data: role };
  } catch (error: unknown) {
    const e = error as Error;
    return { success: false, error: e.message || 'Failed to clone role' };
  }
}

export async function updateRolePermissionsAction(roleId: string, newPermissionIds: string[]) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId || !session.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    // Check old permissions to record audit log diff
    const oldRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    });
    
    await RoleService.assignPermissions((session.user as any).tenantId, roleId, newPermissionIds);
    
    // Create Audit Log Diff
    const oldIds = oldRole?.permissions.map(p => p.permissionId) || [];
    const added = newPermissionIds.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !newPermissionIds.includes(id));

    await prisma.auditLog.create({
      data: {
        tenantId: (session.user as any).tenantId,
        userId: session.user.id,
        action: 'ROLE_PERMISSIONS_UPDATED',
        entityType: 'Role',
        entityId: roleId,
        details: JSON.stringify({ added, removed })
      } as any
    });

    revalidatePath(`/dashboard/roles/${roleId}`);
    return { success: true };
  } catch (error: unknown) {
    const e = error as Error;
    return { success: false, error: e.message || 'Failed to update permissions' };
  }
}
