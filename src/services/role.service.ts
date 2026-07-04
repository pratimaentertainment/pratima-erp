import { RoleRepository } from '@/repositories/role.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { rbacCache } from '@/lib/rbac/cache';
import { Prisma } from '@prisma/client';

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

  static async createRole(tenantId: string, data: Prisma.RoleUncheckedCreateInput) {
    return RoleRepository.createRole(tenantId, {
      ...data,
      isSystem: false, // Ensure UI cannot create system roles
    });
  }

  static async updateRole(tenantId: string, roleId: string, data: Prisma.RoleUncheckedUpdateInput) {
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
    
    const oldPermissionIds = role.permissions.map(p => p.permissionId);
    
    // In a real app, you would log `oldPermissionIds` vs `newPermissionIds` to the Audit Log here.
    await RoleRepository.assignPermissionsToRole(roleId, newPermissionIds);
    
    // Flush cache so all users pick up the new permissions
    rbacCache.invalidateAll();
    
    return { success: true };
  }

  /**
   * Retrieves all effective permissions for a user, using cache.
   */
  static async getEffectivePermissions(userId: string) {
    let permissions = rbacCache.get(userId);
    if (!permissions) {
      permissions = await PermissionRepository.findEffectivePermissionsByUserId(userId);
      rbacCache.set(userId, permissions);
    }
    return permissions;
  }

  /**
   * RBAC Utility: Check if a user has a specific permission.
   * branchId is prepared for future branch scope.
   */
  static async hasPermission(userId: string, module: string, action: string, branchId?: string): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId);
    return permissions.some(p => p.module === module && p.action === action);
  }

  /**
   * RBAC Utility: Check if a user has ANY of the specified permissions.
   */
  static async hasAnyPermission(userId: string, required: { module: string, action: string }[], branchId?: string): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId);
    return required.some(req => 
      permissions.some(p => p.module === req.module && p.action === req.action)
    );
  }

  /**
   * RBAC Utility: Check if a user has ALL of the specified permissions.
   */
  static async hasAllPermissions(userId: string, required: { module: string, action: string }[], branchId?: string): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId);
    return required.every(req => 
      permissions.some(p => p.module === req.module && p.action === req.action)
    );
  }
}
