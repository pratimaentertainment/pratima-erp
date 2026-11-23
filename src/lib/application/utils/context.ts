import { auth } from '@/auth';
import { RoleService } from '@/services/role.service';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { getActiveImpersonationState } from '@/lib/impersonation';

export interface ServiceContext {
  tenantId: string;
  branchId: string | null;
  userId: string;
  roleIds: string[];
  permissions: string[];
  requestId: string;
}

function hasPermissionMatch(permissions: string[], required: string): boolean {
  if (permissions.includes(required)) return true;

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normRequired = normalize(required);

  for (const perm of permissions) {
    const normPerm = normalize(perm);
    if (normPerm === normRequired) return true;

    // e.g. perm = "QUOTATION:CREATE", required = "Create Quotations" or "QUOTATION_CREATE"
    const parts = perm.split(':');
    if (parts.length === 2) {
      const [mod, act] = parts;
      const modNorm = normalize(mod);
      const actNorm = normalize(act);

      if (normRequired === `${actNorm}${modNorm}` || normRequired === `${modNorm}${actNorm}`) {
        return true;
      }

      // Handle singular/plural variations (e.g. "Quotations" vs "Quotation")
      const modSingular = modNorm.endsWith('s') ? modNorm.slice(0, -1) : modNorm;
      const reqSingular = normRequired.replace(/s$/, '');

      if (
        reqSingular === `${actNorm}${modSingular}` ||
        reqSingular === `${modSingular}${actNorm}` ||
        normPerm.replace(/s$/, '') === reqSingular
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function buildContextAndAuthorize(requiredPermission?: string): Promise<ServiceContext> {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const userId = session.user.id!;
  let tenantId = (session.user as any).tenantId;
  let activeBranchId = (session.user as any).activeBranchId || null;

  // Check for Admin / Super Admin bypass
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  
  const roleIds = userRoles.map(ur => ur.roleId);
  const adminRoleNames = new Set([
    'Super Admin',
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'Tenant Admin',
    'Admin',
    'ADMIN',
    'Studio Owner',
    'STUDIO_OWNER',
    'Owner',
    'OWNER',
  ]);

  const sessionUserRole = (session.user as any)?.role;
  const isSuperAdmin =
    sessionUserRole === 'SUPER_ADMIN' ||
    userRoles.some(ur => adminRoleNames.has(ur.role.name) || ur.role.isSystem === true);
  const isTenantOwner =
    sessionUserRole === 'TENANT_OWNER' ||
    userRoles.some(
      ur => ur.role.name === 'TENANT_OWNER' || ur.role.name === 'Studio Owner' || ur.role.name === 'Owner'
    );

  // If Super Admin has an active support impersonation session, scope context to target tenant
  if (isSuperAdmin) {
    const impersonation = await getActiveImpersonationState();
    if (impersonation?.tenantId) {
      tenantId = impersonation.tenantId;
    }
  }

  // Resolve permissions from cache / DB via RoleService instead of JWT
  const permissionsData = await RoleService.getEffectivePermissions(userId);
  const permissions = permissionsData.map(p => `${p.module}:${p.action}`);

  // Allow Super Admins AND Tenant Owners to bypass granular permission string checks
  if (requiredPermission && !isSuperAdmin && !isTenantOwner && !hasPermissionMatch(permissions, requiredPermission)) {
    throw new Error('Forbidden: You do not have permission to perform this action');
  }

  // Validate the activeBranchId against the database to ensure it's still assigned and active
  const userBranches = await prisma.userBranch.findMany({
    where: { userId, isActive: true, branch: { tenantId, isActive: true, deletedAt: null } },
  });

  if (userBranches.length === 0) {
    // If no user-specific branch assignment, fall back to tenant's head office or primary active branch
    const defaultBranch = await prisma.branch.findFirst({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { isHeadOffice: 'desc' },
    });
    activeBranchId = defaultBranch ? defaultBranch.id : null;
  } else {
    const isValid = userBranches.some(ub => ub.branchId === activeBranchId);
    if (!activeBranchId || !isValid) {
      // Safely fall back to the primary branch, or the first available branch
      const primaryBranch = userBranches.find(ub => ub.isPrimary) || userBranches[0];
      activeBranchId = primaryBranch.branchId;
    }
  }

  // If still null, query any active branch for this tenant
  if (!activeBranchId && tenantId) {
    const fallbackBranch = await prisma.branch.findFirst({
      where: { tenantId, isActive: true, deletedAt: null },
    });
    if (fallbackBranch) {
      activeBranchId = fallbackBranch.id;
    }
  }

  if (isSuperAdmin || isTenantOwner) {
    permissions.includes = () => true;
  }

  return {
    tenantId,
    branchId: activeBranchId,
    userId,
    roleIds,
    permissions,
    requestId: crypto.randomUUID(),
  };
}
