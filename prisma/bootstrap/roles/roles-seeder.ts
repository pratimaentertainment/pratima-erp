import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';

export async function seedRoles(tenantId: string) {
  logger.info(`Seeding Roles for tenant ${tenantId}...`);
  
  const roleName = 'Super Admin';

  let role = await prisma.role.findFirst({
    where: { tenantId, name: roleName }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId,
        name: roleName,
        description: 'System Administrator with all permissions',
        isSystem: true,
      }
    });
    logger.success(`Created Role: ${role.name}`);
  } else {
    logger.info(`Role ${roleName} already exists.`);
  }

  // Map all permissions to Super Admin
  const allPermissions = await prisma.permission.findMany();
  
  // Find existing mapped permissions
  const existingMappings = await prisma.rolePermission.findMany({
    where: { roleId: role.id }
  });
  const existingPermIds = new Set(existingMappings.map(m => m.permissionId));

  let mappedCount = 0;
  for (const perm of allPermissions) {
    if (!existingPermIds.has(perm.id)) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id
        }
      });
      mappedCount++;
    }
  }

  if (mappedCount > 0) {
    logger.success(`Mapped ${mappedCount} new permissions to ${roleName}`);
  } else {
    logger.info(`All permissions are already mapped to ${roleName}`);
  }

  return role;
}
