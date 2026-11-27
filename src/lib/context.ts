import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { buildContextAndAuthorize, ServiceContext } from '@/lib/application/utils/context';
import { getActiveImpersonationState, ImpersonationState } from '@/lib/impersonation';
import { getTenantEntitlements } from '@/services/billing/entitlement.service';

export interface ActiveContextUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  mustChangePassword?: boolean;
}

export interface ActiveContextBranch {
  id: string;
  name: string;
  code?: string | null;
  isHeadOffice?: boolean;
  isActive?: boolean;
}

export interface ActiveContextTenant {
  id: string;
  name: string;
  slug?: string | null;
  tradeName?: string | null;
  companyLegalName?: string | null;
  logoUrl?: string | null;
  isFranchisor?: boolean;
  parentTenantId?: string | null;
  features?: string[];
}

export interface ActiveContext {
  user: ActiveContextUser | null;
  tenant: ActiveContextTenant | null;
  activeBranch: ActiveContextBranch | null;
  branches: ActiveContextBranch[];
  tenantId: string;
  userId: string;
  branchId: string | null;
  isAllBranches: boolean;
  permissions: string[];
  isOwnerOrAdmin: boolean;
  impersonation?: ImpersonationState | null;
}

/**
 * Resolves the complete multi-tenant, role-aware, branch-aware active context.
 * Wrapped in React.cache() to deduplicate execution within the same request lifecycle.
 */
export const getActiveContext = cache(async function getActiveContext(): Promise<ActiveContext | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id || (session.user as any).sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED_ACCESS');
  }
  let tenantId = (session.user as any).tenantId;

  // Check cookie for user branch selection preference
  let cookieBranchId: string | null = null;
  try {
    const cookieStore = await cookies();
    cookieBranchId = cookieStore.get('pratima_active_branch_id')?.value || null;
  } catch {
    cookieBranchId = null;
  }

  // Support Mode: Check if Super Admin is impersonating a tenant workspace
  const sessionRole = (session.user as any)?.role;
  let impersonation: ImpersonationState | null = null;

  const rawImpersonation = await getActiveImpersonationState();
  if (rawImpersonation && sessionRole === 'SUPER_ADMIN') {
    impersonation = rawImpersonation;
    tenantId = rawImpersonation.tenantId;
  }

  const activeBranchId = cookieBranchId || (session.user as any).activeBranchId || null;

  const [dbUser, tenant, userBranches, allTenantBranches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    tenantId
      ? prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            tradeName: true,
            companyLegalName: true,
            logoUrl: true,
            isFranchisor: true,
            parentTenantId: true,
          },
        })
      : null,
    prisma.userBranch.findMany({
      where: { userId, isActive: true },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isHeadOffice: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { branch: { name: 'asc' } }],
    }),
    tenantId
      ? prisma.branch.findMany({
          where: { tenantId, deletedAt: null, isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            isHeadOffice: true,
            isActive: true,
          },
          orderBy: [{ isHeadOffice: 'desc' }, { name: 'asc' }],
        })
      : [],
  ]);

  const roleNames = dbUser?.roles?.map((r) => r.role.name) || [];
  const userRole = dbUser?.role || sessionRole;

  let resolvedTenant = tenant;
  let resolvedBranches = allTenantBranches;

  // In case the user is SUPER_ADMIN in DB but session didn't reflect it
  if (
    rawImpersonation &&
    !impersonation &&
    (userRole === 'SUPER_ADMIN' || roleNames.includes('SUPER_ADMIN'))
  ) {
    impersonation = rawImpersonation;
    tenantId = rawImpersonation.tenantId;

    const [impTenant, impBranches] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          tradeName: true,
          companyLegalName: true,
          logoUrl: true,
          isFranchisor: true,
          parentTenantId: true,
        },
      }),
      prisma.branch.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          isHeadOffice: true,
          isActive: true,
        },
        orderBy: [{ isHeadOffice: 'desc' }, { name: 'asc' }],
      }),
    ]);
    resolvedTenant = impTenant;
    resolvedBranches = impBranches;
  }

  const isOwnerOrAdmin =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'TENANT_OWNER' ||
    roleNames.includes('SUPER_ADMIN') ||
    roleNames.includes('TENANT_OWNER') ||
    roleNames.includes('Owner') ||
    roleNames.includes('Admin');

  let primaryRole = 'STAFF';
  if (userRole === 'SUPER_ADMIN' || roleNames.includes('SUPER_ADMIN')) {
    primaryRole = 'SUPER_ADMIN';
  } else if (
    userRole === 'TENANT_OWNER' ||
    roleNames.includes('TENANT_OWNER') ||
    roleNames.includes('Owner')
  ) {
    primaryRole = 'TENANT_OWNER';
  } else if (roleNames.includes('BRANCH_MANAGER') || roleNames.includes('Manager')) {
    primaryRole = 'BRANCH_MANAGER';
  } else if (roleNames[0]) {
    primaryRole = roleNames[0];
  }

  // Branch access strictly governed by RBAC:
  // TENANT_OWNER / SUPER_ADMIN sees all tenant branches.
  // Lower staff sees only their assigned user branches.
  const branches = isOwnerOrAdmin
    ? resolvedBranches
    : userBranches.map((ub) => ub.branch).filter(Boolean);

  // Evaluate Owner "All Branches" mode
  const isAllBranches = Boolean(isOwnerOrAdmin && activeBranchId === 'ALL');

  const activeBranch: ActiveContextBranch | null = isAllBranches
    ? {
        id: 'ALL',
        name: 'All Branches (Consolidated)',
        code: 'ALL',
        isHeadOffice: false,
        isActive: true,
      }
    : (branches.find((b) => b.id === activeBranchId) ||
       branches.find((b) => b.isHeadOffice) ||
       branches[0] ||
       null);

  const user = dbUser
    ? {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: primaryRole,
        roles: roleNames,
        mustChangePassword: dbUser.mustChangePassword ?? false,
      }
    : null;

  let tenantFeatures: string[] = [];
  if (tenantId) {
    try {
      const entitlements = await getTenantEntitlements(tenantId);
      tenantFeatures = entitlements.features;
    } catch {
      tenantFeatures = [];
    }
  }

  const finalTenant: ActiveContextTenant | null = resolvedTenant
    ? {
        ...resolvedTenant,
        features: tenantFeatures,
      }
    : null;

  return {
    user,
    tenant: finalTenant,
    activeBranch,
    branches,
    tenantId: tenantId || '',
    userId,
    branchId: isAllBranches ? null : (activeBranch ? activeBranch.id : null),
    isAllBranches,
    permissions: [],
    isOwnerOrAdmin,
    impersonation,
  };
});

export { buildContextAndAuthorize };
export type { ServiceContext };
