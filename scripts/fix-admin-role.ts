import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@pratimaerp.com' }
  }) || await prisma.user.findFirst();

  if (!user) {
    console.error('No user found');
    process.exit(1);
  }

  // Find or create SUPER_ADMIN role for this tenant
  let role = await prisma.role.findFirst({
    where: {
      tenantId: user.tenantId,
      name: 'SUPER_ADMIN'
    }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: user.tenantId,
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full access',
        isSystem: true
      }
    });
  }

  // Grant role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id
    }
  });

  // Attach all available permissions to the role to ensure it never gets 403
  const allPermissions = await prisma.permission.findMany();
  
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: perm.id
      }
    });
  }

  console.log(`Successfully granted SUPER_ADMIN role to ${user.email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
