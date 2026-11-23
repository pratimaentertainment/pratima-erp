import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Starting seed...');

  // 1. Create or find Tenant
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Pratima Studio' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Pratima Studio',
        slug: 'pratima-studio',
        contactPhone: '+919999999999',
      }
    });
  }

  // 2. Create or find Branch
  let branch = await prisma.branch.findFirst({ where: { name: 'Headquarters', tenantId: tenant.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Headquarters',
        isHeadOffice: true,
      }
    });
  }

  // 3. Link Existing User
  const existingUser = await prisma.user.findFirst();
  let userId;
  if (existingUser) {
    console.log('Linking existing user:', existingUser.email);
    // If the user is on another tenant, we can't easily change tenantId on Prisma if it's strict,
    // so we connect.
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        tenant: { connect: { id: tenant.id } }
      }
    });
    
    // Add UserBranch
    const existingUb = await prisma.userBranch.findFirst({
      where: { userId: existingUser.id, branchId: branch.id }
    });
    if (!existingUb) {
      await prisma.userBranch.create({
        data: {
          userId: existingUser.id,
          branchId: branch.id,
          isPrimary: true
        }
      });
    }

    userId = existingUser.id;
  } else {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const newUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@pratimaerp.com',
        name: 'Admin User',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
      }
    });
    
    await prisma.userBranch.create({
      data: {
        userId: newUser.id,
        branchId: branch.id,
        isPrimary: true
      }
    });
    
    userId = newUser.id;
  }

  // --- START ADMIN LOGIC ---
  console.log('Ensuring SUPER_ADMIN role for user:', userId);
  let role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'SUPER_ADMIN' }
  });
  if (!role) {
    role = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'SUPER_ADMIN', description: 'Super Administrator', isSystem: true }
    });
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id }
  });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id }
    });
  }
  console.log('SUPER_ADMIN access configured.');
  // --- END ADMIN LOGIC ---


  // 4. Create Lead Sources
  const sources = ['WEBSITE', 'INSTAGRAM', 'WALK_IN'];
  for (const source of sources) {
    const existingSource = await prisma.leadSource.findFirst({ where: { name: source, tenantId: tenant.id } });
    if (!existingSource) {
      await prisma.leadSource.create({
        data: {
          tenantId: tenant.id,
          name: source,
          code: source,
          isActive: true
        }
      });
    }
  }

  // 5. Create Clients
  const clientsToCreate = [
    { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@example.com', phone: '9876543210' },
    { firstName: 'Priya', lastName: 'Desai', email: 'priya@example.com', phone: '8765432109' }
  ];

  for (let i = 0; i < clientsToCreate.length; i++) {
    const c = clientsToCreate[i];
    const existingClient = await prisma.customer.findFirst({ where: { email: c.email, tenantId: tenant.id } });
    if (!existingClient) {
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          customerCode: `CL-${Date.now()}-${i}`,
          
          firstName: c.firstName,
          lastName: c.lastName,
          
          email: c.email,
          phone: c.phone,
          createdById: userId,
        }
      });
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Cannot disconnect safely with our singleton in dev, but standard prisma.disconnect doesn't exist on standard export.
    // We just exit process instead in next line if it fails, or it will naturally close.
    process.exit(0);
  });
