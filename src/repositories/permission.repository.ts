import { prisma } from '@/lib/prisma';

export class PermissionRepository {
  /**
   * Fetch all permissions grouped by module.
   * Useful for rendering the Permission Matrix UI.
   */
  static async findAllGroupedByModule() {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });

    const grouped: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    }
    return grouped;
  }

  /**
   * Fetch a flat list of effective permissions for a user across all their assigned roles.
   */
  static async findEffectivePermissionsByUserId(userId: string) {
    // A user can have multiple roles in future-proofing, though standard uses 1 role per branch.
    // Query UserRole -> Role -> RolePermission -> Permission
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const permissionMap = new Map<string, { module: string; action: string }>();

    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        const p = rp.permission;
        const key = `${p.module}:${p.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, { module: p.module, action: p.action });
        }
      }
    }

    return Array.from(permissionMap.values());
  }
}
