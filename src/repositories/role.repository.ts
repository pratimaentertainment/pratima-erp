import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RoleRepository {
  static async findRolesByTenant(tenantId: string) {
    return prisma.role.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { permissions: true, users: true }
        }
      }
    });
  }

  static async getRoleWithPermissions(roleId: string, tenantId: string) {
    return prisma.role.findUnique({
      where: { id: roleId, tenantId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  static async createRole(tenantId: string, data: Prisma.RoleUncheckedCreateInput) {
    return prisma.role.create({
      data: {
        ...data,
        tenantId,
      }
    });
  }

  static async updateRole(tenantId: string, roleId: string, data: Prisma.RoleUncheckedUpdateInput) {
    return prisma.role.update({
      where: { id: roleId, tenantId },
      data
    });
  }

  static async deleteRole(tenantId: string, roleId: string) {
    return prisma.role.delete({
      where: { id: roleId, tenantId }
    });
  }

  static async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Perform in a transaction: delete old mappings, insert new ones
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId,
            permissionId
          }))
        });
      }
    });
  }

  static async cloneRole(tenantId: string, sourceRoleId: string, newName: string) {
    return prisma.$transaction(async (tx) => {
      const sourceRole = await tx.role.findUnique({
        where: { id: sourceRoleId, tenantId },
        include: { permissions: true }
      });

      if (!sourceRole) throw new Error("Source role not found");

      // Create new role
      const newRole = await tx.role.create({
        data: {
          tenantId,
          name: newName,
          description: `Cloned from ${sourceRole.name}`,
          isSystem: false,
        }
      });

      // Clone permissions
      if (sourceRole.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: sourceRole.permissions.map(p => ({
            roleId: newRole.id,
            permissionId: p.permissionId
          }))
        });
      }

      return newRole;
    });
  }
}
