import { RoleRepository } from '@/repositories/role.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { rbacCache } from '@/lib/rbac/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class RoleService {
  /**
   * Prevents any modification to system roles.
   */
  private static async ensureNotSystemRole(tenantId: string, roleId: string) {
    const role = await RoleRepository.getRoleWithPermissions(roleId, tenantId);
    if (!role) throw new Error("Role not found");
    if (role.isSystem) {
      throw new Error("System roles cannot be modified or deleted.");
    }
    return role;
  }

  static async createRole(tenantId: string, data: Prisma.TenantRoleUncheckedCreateInput) {
    return RoleRepository.createRole(tenantId, {
      ...data,
      isSystem: false, // Ensure UI cannot create system roles
    });
  }

  static async updateRole(tenantId: string, roleId: string, data: Prisma.TenantRoleUncheckedUpdateInput) {
    await this.ensureNotSystemRole(tenantId, roleId);
    return RoleRepository.updateRole(tenantId, roleId, data);
  }

  static async deleteRole(tenantId: string, roleId: string) {
    await this.ensureNotSystemRole(tenantId, roleId);
    return RoleRepository.deleteRole(tenantId, roleId);
  }

  static async cloneRole(tenantId: string, sourceRoleId: string, newName: string) {
    return RoleRepository.cloneRole(tenantId, sourceRoleId, newName);
  }

  static async assignPermissions(tenantId: string, roleId: string, newPermissionIds: string[]) {
    const role = await this.ensureNotSystemRole(tenantId, roleId);
    
    const oldPermissionIds = role.permissions.map((p: any) => p.permissionId);
    
    // In a real app, you would log `oldPermissionIds` vs `newPermissionIds` to the Audit Log here.
    await RoleRepository.assignPermissionsToRole(roleId, newPermissionIds);
    
    // Flush cache so all users pick up the new permissions
    rbacCache.invalidateAll();
    
    return { success: true };
  }

  /**
   * Helper to retrieve and cache the user's primary system role or tenant role.
   */
  static async getUserRole(userId: string): Promise<string | null> {
    const cachedRole = rbacCache.getRole(userId);
    if (cachedRole !== undefined) {
      return cachedRole;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          roles: {
            include: {
              role: {
                select: {
                  name: true,
                  isSystem: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        rbacCache.setRole(userId, null);
        return null;
      }

      // Check system enum role first
      if (user.role === 'SUPER_ADMIN' || user.role === 'TENANT_OWNER') {
        rbacCache.setRole(userId, user.role);
        return user.role;
      }

      // Check assigned roles for system/owner level roles
      const hasSuperAdminRole = user.roles.some(
        (r) => r.role.name.toUpperCase() === 'SUPER_ADMIN' || r.role.name === 'Super Admin'
      );
      if (hasSuperAdminRole) {
        rbacCache.setRole(userId, 'SUPER_ADMIN');
        return 'SUPER_ADMIN';
      }

      const isOwnerRole = user.roles.some(
        (r) =>
          r.role.name.toUpperCase() === 'TENANT_OWNER' ||
          r.role.name === 'Studio Owner' ||
          r.role.name === 'Tenant Owner' ||
          r.role.name === 'Owner'
      );
      if (isOwnerRole) {
        rbacCache.setRole(userId, 'TENANT_OWNER');
        return 'TENANT_OWNER';
      }

      rbacCache.setRole(userId, user.role);
      return user.role;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all effective permissions for a user, using cache.
   * Root users (SUPER_ADMIN, TENANT_OWNER) implicitly receive all system permissions.
   */
  static async getEffectivePermissions(userId: string) {
    let permissions = rbacCache.get(userId);
    if (!permissions) {
      const userRole = await this.getUserRole(userId);
      if (userRole === 'TENANT_OWNER' || userRole === 'SUPER_ADMIN') {
        const allPermissions = await prisma.permission.findMany({
          select: { module: true, action: true },
        });
        permissions = allPermissions;
      } else {
        permissions = await PermissionRepository.findEffectivePermissionsByUserId(userId);
      }
      rbacCache.set(userId, permissions);
    }
    return permissions;
  }

  /**
   * RBAC Utility: Check if a user has a specific permission.
   * Implicit God Mode: TENANT_OWNER and SUPER_ADMIN bypass permission checks.
   * Enforces branch-level scoping if branchId is provided for non-god-mode users.
   */
  static async hasPermission(userId: string, module: string, action: string, branchId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    if (userRole === 'TENANT_OWNER' || userRole === 'SUPER_ADMIN') {
      return true;
    }

    // Branch RBAC validation:
    // If branchId is provided, non-owner/non-superadmin users MUST have an active UserBranch mapping for this branch
    if (branchId && branchId !== 'ALL') {
      const userBranch = await prisma.userBranch.findFirst({
        where: {
          userId,
          branchId,
          isActive: true,
        },
      });
      if (!userBranch) {
        return false;
      }
    }

    const permissions = await this.getEffectivePermissions(userId);
    const targetModule = module.toUpperCase();
    const targetAction = action.toUpperCase();
    return permissions.some(
      (p) => p.module.toUpperCase() === targetModule && p.action.toUpperCase() === targetAction
    );
  }

  /**
   * RBAC Utility: Check if a user has ANY of the specified permissions.
   * Implicit God Mode: TENANT_OWNER and SUPER_ADMIN bypass permission checks.
   * Enforces branch-level scoping if branchId is provided for non-god-mode users.
   */
  static async hasAnyPermission(userId: string, required: { module: string, action: string }[], branchId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    if (userRole === 'TENANT_OWNER' || userRole === 'SUPER_ADMIN') {
      return true;
    }

    if (branchId && branchId !== 'ALL') {
      const userBranch = await prisma.userBranch.findFirst({
        where: {
          userId,
          branchId,
          isActive: true,
        },
      });
      if (!userBranch) {
        return false;
      }
    }

    const permissions = await this.getEffectivePermissions(userId);
    return required.some((req) => {
      const targetModule = req.module.toUpperCase();
      const targetAction = req.action.toUpperCase();
      return permissions.some(
        (p) => p.module.toUpperCase() === targetModule && p.action.toUpperCase() === targetAction
      );
    });
  }

  /**
   * RBAC Utility: Check if a user has ALL of the specified permissions.
   * Implicit God Mode: TENANT_OWNER and SUPER_ADMIN bypass permission checks.
   * Enforces branch-level scoping if branchId is provided for non-god-mode users.
   */
  static async hasAllPermissions(userId: string, required: { module: string, action: string }[], branchId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    if (userRole === 'TENANT_OWNER' || userRole === 'SUPER_ADMIN') {
      return true;
    }

    if (branchId && branchId !== 'ALL') {
      const userBranch = await prisma.userBranch.findFirst({
        where: {
          userId,
          branchId,
          isActive: true,
        },
      });
      if (!userBranch) {
        return false;
      }
    }

    const permissions = await this.getEffectivePermissions(userId);
    return required.every((req) => {
      const targetModule = req.module.toUpperCase();
      const targetAction = req.action.toUpperCase();
      return permissions.some(
        (p) => p.module.toUpperCase() === targetModule && p.action.toUpperCase() === targetAction
      );
    });
  }

  /**
   * Universal Tenant Permission Seeding.
   * Ensures that all core module permissions (Quotations, Leads, Inquiries, Customers, Packages, etc.)
   * exist in the database and are linked to default Admin / Studio Owner roles for the specified tenant.
   */
  static async provisionTenantAdminRoles(tenantId: string, tx?: Prisma.TransactionClient) {
    const { prisma } = await import('@/lib/prisma');
    const client = tx || prisma;

    const CORE_SYSTEM_PERMISSIONS = [
      // Quotation Permissions
      { module: 'QUOTATION', action: 'READ', name: 'QUOTATION:READ' },
      { module: 'QUOTATION', action: 'VIEW', name: 'QUOTATION:VIEW' },
      { module: 'QUOTATION', action: 'CREATE', name: 'QUOTATION:CREATE' },
      { module: 'QUOTATION', action: 'UPDATE', name: 'QUOTATION:UPDATE' },
      { module: 'QUOTATION', action: 'DELETE', name: 'QUOTATION:DELETE' },
      { module: 'QUOTATION', action: 'APPROVE', name: 'QUOTATION:APPROVE' },
      { module: 'QUOTATION', action: 'MANAGE', name: 'QUOTATION:MANAGE' },
      { module: 'Quotations', action: 'View', name: 'Quotations:View' },
      { module: 'Quotations', action: 'Create', name: 'Quotations:Create' },
      { module: 'Quotations', action: 'Update', name: 'Quotations:Update' },
      { module: 'Quotations', action: 'Delete', name: 'Quotations:Delete' },
      { module: 'Quotations', action: 'Approve', name: 'Quotations:Approve' },

      // Lead Permissions
      { module: 'LEAD', action: 'READ', name: 'LEAD:READ' },
      { module: 'LEAD', action: 'VIEW', name: 'LEAD:VIEW' },
      { module: 'LEAD', action: 'CREATE', name: 'LEAD:CREATE' },
      { module: 'LEAD', action: 'UPDATE', name: 'LEAD:UPDATE' },
      { module: 'LEAD', action: 'DELETE', name: 'LEAD:DELETE' },
      { module: 'LEAD', action: 'ASSIGN', name: 'LEAD:ASSIGN' },
      { module: 'LEAD', action: 'MANAGE', name: 'LEAD:MANAGE' },
      { module: 'Leads', action: 'View', name: 'Leads:View' },
      { module: 'Leads', action: 'Create', name: 'Leads:Create' },
      { module: 'Leads', action: 'Update', name: 'Leads:Update' },
      { module: 'Leads', action: 'Delete', name: 'Leads:Delete' },
      { module: 'Leads', action: 'Assign', name: 'Leads:Assign' },

      // Inquiry Permissions
      { module: 'INQUIRY', action: 'READ', name: 'INQUIRY:READ' },
      { module: 'INQUIRY', action: 'VIEW', name: 'INQUIRY:VIEW' },
      { module: 'INQUIRY', action: 'CREATE', name: 'INQUIRY:CREATE' },
      { module: 'INQUIRY', action: 'UPDATE', name: 'INQUIRY:UPDATE' },
      { module: 'INQUIRY', action: 'DELETE', name: 'INQUIRY:DELETE' },
      { module: 'INQUIRY', action: 'MANAGE', name: 'INQUIRY:MANAGE' },
      { module: 'Inquiries', action: 'View', name: 'Inquiries:View' },
      { module: 'Inquiries', action: 'Create', name: 'Inquiries:Create' },
      { module: 'Inquiries', action: 'Update', name: 'Inquiries:Update' },
      { module: 'Inquiries', action: 'Delete', name: 'Inquiries:Delete' },

      // Customer Permissions
      { module: 'CUSTOMER', action: 'READ', name: 'CUSTOMER:READ' },
      { module: 'CUSTOMER', action: 'VIEW', name: 'CUSTOMER:VIEW' },
      { module: 'CUSTOMER', action: 'CREATE', name: 'CUSTOMER:CREATE' },
      { module: 'CUSTOMER', action: 'UPDATE', name: 'CUSTOMER:UPDATE' },
      { module: 'CUSTOMER', action: 'DELETE', name: 'CUSTOMER:DELETE' },
      { module: 'CUSTOMER', action: 'MANAGE', name: 'CUSTOMER:MANAGE' },
      { module: 'Customers', action: 'View', name: 'Customers:View' },
      { module: 'Customers', action: 'Create', name: 'Customers:Create' },
      { module: 'Customers', action: 'Update', name: 'Customers:Update' },
      { module: 'Customers', action: 'Delete', name: 'Customers:Delete' },

      // Package Permissions
      { module: 'PACKAGE', action: 'READ', name: 'PACKAGE:READ' },
      { module: 'PACKAGE', action: 'VIEW', name: 'PACKAGE:VIEW' },
      { module: 'PACKAGE', action: 'CREATE', name: 'PACKAGE:CREATE' },
      { module: 'PACKAGE', action: 'UPDATE', name: 'PACKAGE:UPDATE' },
      { module: 'PACKAGE', action: 'DELETE', name: 'PACKAGE:DELETE' },
      { module: 'PACKAGE', action: 'MANAGE', name: 'PACKAGE:MANAGE' },
      { module: 'Packages', action: 'View', name: 'Packages:View' },
      { module: 'Packages', action: 'Manage', name: 'Packages:Manage' },
      { module: 'Packages', action: 'Create', name: 'Packages:Create' },
      { module: 'Packages', action: 'Update', name: 'Packages:Update' },
      { module: 'Packages', action: 'Delete', name: 'Packages:Delete' },

      // Projects & Shoots
      { module: 'PROJECT', action: 'READ', name: 'PROJECT:READ' },
      { module: 'PROJECT', action: 'VIEW', name: 'PROJECT:VIEW' },
      { module: 'PROJECT', action: 'CREATE', name: 'PROJECT:CREATE' },
      { module: 'PROJECT', action: 'UPDATE', name: 'PROJECT:UPDATE' },
      { module: 'PROJECT', action: 'DELETE', name: 'PROJECT:DELETE' },
      { module: 'PROJECT', action: 'MANAGE', name: 'PROJECT:MANAGE' },
      { module: 'Projects', action: 'View', name: 'Projects:View' },
      { module: 'Projects', action: 'Create', name: 'Projects:Create' },
      { module: 'Projects', action: 'Update', name: 'Projects:Update' },
      { module: 'Projects', action: 'Delete', name: 'Projects:Delete' },
      { module: 'SHOOT', action: 'READ', name: 'SHOOT:READ' },
      { module: 'SHOOT', action: 'VIEW', name: 'SHOOT:VIEW' },
      { module: 'SHOOT', action: 'CREATE', name: 'SHOOT:CREATE' },
      { module: 'SHOOT', action: 'UPDATE', name: 'SHOOT:UPDATE' },
      { module: 'SHOOT', action: 'DELETE', name: 'SHOOT:DELETE' },
      { module: 'SHOOT', action: 'MANAGE', name: 'SHOOT:MANAGE' },

      // Equipment & Operations
      { module: 'EQUIPMENT', action: 'READ', name: 'EQUIPMENT:READ' },
      { module: 'EQUIPMENT', action: 'VIEW', name: 'EQUIPMENT:VIEW' },
      { module: 'EQUIPMENT', action: 'CREATE', name: 'EQUIPMENT:CREATE' },
      { module: 'EQUIPMENT', action: 'UPDATE', name: 'EQUIPMENT:UPDATE' },
      { module: 'EQUIPMENT', action: 'DELETE', name: 'EQUIPMENT:DELETE' },
      { module: 'EQUIPMENT', action: 'MANAGE', name: 'EQUIPMENT:MANAGE' },
      { module: 'Equipment', action: 'View', name: 'Equipment:View' },
      { module: 'Equipment', action: 'Manage', name: 'Equipment:Manage' },
      { module: 'WORKFLOW_TASK', action: 'READ', name: 'WORKFLOW_TASK:READ' },
      { module: 'WORKFLOW_TASK', action: 'VIEW', name: 'WORKFLOW_TASK:VIEW' },
      { module: 'WORKFLOW_TASK', action: 'CREATE', name: 'WORKFLOW_TASK:CREATE' },
      { module: 'WORKFLOW_TASK', action: 'UPDATE', name: 'WORKFLOW_TASK:UPDATE' },
      { module: 'WORKFLOW_TASK', action: 'DELETE', name: 'WORKFLOW_TASK:DELETE' },
      { module: 'WORKFLOW_TASK', action: 'MANAGE', name: 'WORKFLOW_TASK:MANAGE' },

      // Master Data
      { module: 'MASTER_DATA', action: 'READ', name: 'MASTER_DATA:READ' },
      { module: 'MASTER_DATA', action: 'VIEW', name: 'MASTER_DATA:VIEW' },
      { module: 'MASTER_DATA', action: 'CREATE', name: 'MASTER_DATA:CREATE' },
      { module: 'MASTER_DATA', action: 'UPDATE', name: 'MASTER_DATA:UPDATE' },
      { module: 'MASTER_DATA', action: 'DELETE', name: 'MASTER_DATA:DELETE' },
      { module: 'MASTER_DATA', action: 'MANAGE', name: 'MASTER_DATA:MANAGE' },
      { module: 'Master Data', action: 'View', name: 'Master Data:View' },
      { module: 'Master Data', action: 'Create', name: 'Master Data:Create' },
      { module: 'Master Data', action: 'Update', name: 'Master Data:Update' },
      { module: 'Master Data', action: 'Delete', name: 'Master Data:Delete' },

      // Administration (Tenants, Roles, Users)
      { module: 'TENANT', action: 'READ', name: 'TENANT:READ' },
      { module: 'TENANT', action: 'VIEW', name: 'TENANT:VIEW' },
      { module: 'TENANT', action: 'CREATE', name: 'TENANT:CREATE' },
      { module: 'TENANT', action: 'UPDATE', name: 'TENANT:UPDATE' },
      { module: 'TENANT', action: 'DELETE', name: 'TENANT:DELETE' },
      { module: 'TENANT', action: 'MANAGE', name: 'TENANT:MANAGE' },
      { module: 'Tenants', action: 'View', name: 'Tenants:View' },
      { module: 'Tenants', action: 'Create', name: 'Tenants:Create' },
      { module: 'Tenants', action: 'Update', name: 'Tenants:Update' },
      { module: 'Tenants', action: 'Delete', name: 'Tenants:Delete' },
      { module: 'Tenants', action: 'Manage Billing', name: 'Tenants:Manage Billing' },

      { module: 'ROLE', action: 'READ', name: 'ROLE:READ' },
      { module: 'ROLE', action: 'VIEW', name: 'ROLE:VIEW' },
      { module: 'ROLE', action: 'CREATE', name: 'ROLE:CREATE' },
      { module: 'ROLE', action: 'UPDATE', name: 'ROLE:UPDATE' },
      { module: 'ROLE', action: 'DELETE', name: 'ROLE:DELETE' },
      { module: 'ROLE', action: 'MANAGE', name: 'ROLE:MANAGE' },
      { module: 'Roles', action: 'View', name: 'Roles:View' },
      { module: 'Roles', action: 'Create', name: 'Roles:Create' },
      { module: 'Roles', action: 'Update', name: 'Roles:Update' },
      { module: 'Roles', action: 'Delete', name: 'Roles:Delete' },
      { module: 'Roles', action: 'Clone', name: 'Roles:Clone' },
      { module: 'Roles', action: 'Manage Permissions', name: 'Roles:Manage Permissions' },

      { module: 'USER', action: 'READ', name: 'USER:READ' },
      { module: 'USER', action: 'VIEW', name: 'USER:VIEW' },
      { module: 'USER', action: 'CREATE', name: 'USER:CREATE' },
      { module: 'USER', action: 'UPDATE', name: 'USER:UPDATE' },
      { module: 'USER', action: 'DELETE', name: 'USER:DELETE' },
      { module: 'USER', action: 'MANAGE', name: 'USER:MANAGE' },
      { module: 'Users', action: 'View', name: 'Users:View' },
      { module: 'Users', action: 'Create', name: 'Users:Create' },
      { module: 'Users', action: 'Update', name: 'Users:Update' },
      { module: 'Users', action: 'Delete', name: 'Users:Delete' },
      { module: 'Users', action: 'Assign Roles', name: 'Users:Assign Roles' },
      { module: 'Users', action: 'View Effective Permissions', name: 'Users:View Effective Permissions' },

      // Tenant & Branch Settings Permissions
      { module: 'Tenants', action: 'View', name: 'Tenants:View' },
      { module: 'Tenants', action: 'Update', name: 'Tenants:Update' },
      { module: 'Tenants', action: 'Manage', name: 'Tenants:Manage' },
      { module: 'Branches', action: 'View', name: 'Branches:View' },
      { module: 'Branches', action: 'Create', name: 'Branches:Create' },
      { module: 'Branches', action: 'Update', name: 'Branches:Update' },
      { module: 'Branches', action: 'Delete', name: 'Branches:Delete' },
    ];

    // 1. Ensure all core permissions exist in the Permission table in a single bulk operation
    await client.permission.createMany({
      data: CORE_SYSTEM_PERMISSIONS.map((perm) => ({
        name: perm.name,
        module: perm.module,
        action: perm.action,
      })),
      skipDuplicates: true,
    });

    // Retrieve all permission IDs in one query
    const allPermissions = await client.permission.findMany({
      select: { id: true },
    });
    const allPermissionIds = allPermissions.map((p) => p.id);

    // 2. Ensure default Admin & Operational roles exist for the Tenant
    const adminRoleDefs = [
      { name: 'SUPER_ADMIN', description: 'Super Administrator with full system permissions', isSystem: true },
      { name: 'Super Admin', description: 'Super Administrator with full system permissions', isSystem: true },
      { name: 'Admin', description: 'Tenant Administrator with full permissions', isSystem: false },
      { name: 'Studio Owner', description: 'Studio Owner with full operational permissions', isSystem: false },
      { name: 'BRANCH_MANAGER', description: 'Branch Manager overseeing studio branch operations', isSystem: false },
      { name: 'Branch Manager', description: 'Branch Manager overseeing studio branch operations', isSystem: false },
      { name: 'PROJECT_MANAGER', description: 'Project Manager managing shoot logistics and deliveries', isSystem: false },
      { name: 'SALES_MANAGER', description: 'Sales Manager driving CRM inquiries, quotes and conversions', isSystem: false },
      { name: 'EDITOR', description: 'Editor handling post-production and video/photo cut delivery', isSystem: false },
      { name: 'DESIGNER', description: 'Album & Graphic Designer responsible for proofing and prints', isSystem: false },
      { name: 'FREELANCER', description: 'External creative contractor assigned per-shoot', isSystem: false },
    ];

    // Bulk check & create missing tenant roles in parallel/bulk
    const existingRoles = await (client as any).tenantRole.findMany({
      where: { tenantId },
    });
    const existingRoleMap = new Map<string, any>(existingRoles.map((r: any) => [r.name, r]));
    const missingRoles = adminRoleDefs.filter((def) => !existingRoleMap.has(def.name));

    if (missingRoles.length > 0) {
      await (client as any).tenantRole.createMany({
        data: missingRoles.map((def) => ({
          tenantId,
          name: def.name,
          description: def.description,
          isSystem: def.isSystem,
        })),
        skipDuplicates: true,
      });
    }

    const roles: any[] = await (client as any).tenantRole.findMany({
      where: { tenantId },
    });

    // 3. Link all permissions to each admin role in bulk
    const roleIds = roles.map((r: any) => r.id);
    const existingRolePerms = await client.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { roleId: true, permissionId: true },
    });

    const existingPermKeySet = new Set(
      existingRolePerms.map((rp) => `${rp.roleId}:${rp.permissionId}`)
    );

    const newRolePermsToInsert = [];
    for (const role of roles) {
      for (const permId of allPermissionIds) {
        const key = `${role.id}:${permId}`;
        if (!existingPermKeySet.has(key)) {
          newRolePermsToInsert.push({
            roleId: role.id,
            permissionId: permId,
          });
        }
      }
    }

    if (newRolePermsToInsert.length > 0) {
      await client.rolePermission.createMany({
        data: newRolePermsToInsert,
        skipDuplicates: true,
      });
    }

    // 4. Invalidate RBAC cache
    rbacCache.invalidateAll();

    return roles;
  }

  /**
   * Scans and provisions admin roles with complete permissions for all active tenants.
   */
  static async ensureAllTenantsProvisioned() {
    const { prisma } = await import('@/lib/prisma');
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.provisionTenantAdminRoles(tenant.id);
    }
  }
}
