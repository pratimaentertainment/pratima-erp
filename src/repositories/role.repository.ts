import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RoleRepository {
  static async findRolesByTenant(tenantId: string) {
    return prisma.tenantRole.findMany({
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
    return prisma.tenantRole.findUnique({
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

  static async createRole(tenantId: string, data: Prisma.TenantRoleUncheckedCreateInput) {
    return prisma.tenantRole.create({
      data: {
        ...data,
        tenantId,
      }
    });
  }

  static async updateRole(tenantId: string, roleId: string, data: Prisma.TenantRoleUncheckedUpdateInput) {
    return prisma.tenantRole.update({
      where: { id: roleId, tenantId },
      data
    });
  }

  static async deleteRole(tenantId: string, roleId: string) {
    return prisma.tenantRole.delete({
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
      const sourceRole = await tx.tenantRole.findUnique({
        where: { id: sourceRoleId, tenantId },
        include: { permissions: true }
      });

      if (!sourceRole) throw new Error("Source role not found");

      // Create new role
      const newRole = await tx.tenantRole.create({
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
          data: sourceRole.permissions.map((p: any) => ({
            roleId: newRole.id,
            permissionId: p.permissionId
          }))
        });
      }

      return newRole;
    });
  }
}
