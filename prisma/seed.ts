import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import {
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
  DEFAULT_ADDON_CONFIGS,
} from '../src/lib/constants/plan-features';

async function main() {
  console.log('Starting Pratima ERP database seed...');

  // 1. Seed Global Super Admin
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'framiqbypratima@gmail.com').trim().toLowerCase();
  const superAdminHashedPassword = await bcrypt.hash('Pratima@2026', 10);

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: { equals: superAdminEmail, mode: 'insensitive' } },
  });

  if (existingSuperAdmin) {
    console.log('Updating Super Admin account:', superAdminEmail);
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        name: 'Suhas Wagire',
        passwordHash: superAdminHashedPassword,
        role: Role.SUPER_ADMIN,
        tenantId: null,
        status: 'ACTIVE',
        isActive: true,
        canLogin: true,
        isLocked: false,
        lockUntil: null,
        failedLoginAttempts: 0,
      },
    });
  } else {
    console.log('Creating Super Admin account:', superAdminEmail);
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: 'Suhas Wagire',
        passwordHash: superAdminHashedPassword,
        role: Role.SUPER_ADMIN,
        tenantId: null,
        status: 'ACTIVE',
        isActive: true,
        canLogin: true,
        isLocked: false,
        failedLoginAttempts: 0,
      },
    });
  }

  // 2. Seed Default Tiered Subscription Plans
  const starterPlans = DEFAULT_PACKAGING_PLANS;

  console.log('Upserting default subscription plans...');
  for (const plan of starterPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        originalMonthlyPrice: plan.originalMonthlyPrice,
        monthlyPrice: plan.monthlyPrice,
        originalAnnualPrice: plan.originalAnnualPrice,
        annualPrice: plan.annualPrice,
        offerBadgeText: plan.offerBadgeText,
        isBasePlan: plan.isBasePlan,
        sortOrder: plan.sortOrder,
        maxBranches: plan.maxBranches,
        maxStaff: plan.maxStaff,
        smsCredits: plan.smsCredits,
        whatsappCredits: plan.whatsappCredits,
        allowFranchises: plan.allowFranchises,
        franchiseEnabled: (plan as any).franchiseEnabled ?? plan.allowFranchises,
        includedAddons: (plan as any).includedAddons ?? [],
        perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice,
        perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice,
        isActive: plan.isActive,
        features: plan.features,
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        originalMonthlyPrice: plan.originalMonthlyPrice,
        monthlyPrice: plan.monthlyPrice,
        originalAnnualPrice: plan.originalAnnualPrice,
        annualPrice: plan.annualPrice,
        offerBadgeText: plan.offerBadgeText,
        isBasePlan: plan.isBasePlan,
        sortOrder: plan.sortOrder,
        maxBranches: plan.maxBranches,
        maxStaff: plan.maxStaff,
        smsCredits: plan.smsCredits,
        whatsappCredits: plan.whatsappCredits,
        allowFranchises: plan.allowFranchises,
        franchiseEnabled: (plan as any).franchiseEnabled ?? plan.allowFranchises,
        includedAddons: (plan as any).includedAddons ?? [],
        perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice,
        perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice,
        isActive: plan.isActive,
        features: plan.features,
      },
    });
  }

  // 3. Upsert Modular Add-ons Price Catalog
  console.log('Upserting modular add-on price catalog...');
  for (const addon of DEFAULT_ADDON_CONFIGS) {
    await prisma.planAddonConfig.upsert({
      where: { featureKey: addon.featureKey },
      update: {
        name: addon.name,
        description: addon.description,
        originalMonthlyPrice: addon.originalMonthlyPrice,
        monthlyPrice: addon.monthlyPrice,
        originalAnnualPrice: addon.originalAnnualPrice,
        annualPrice: addon.annualPrice,
        isActive: addon.isActive,
        sortOrder: addon.sortOrder,
      },
      create: {
        featureKey: addon.featureKey,
        name: addon.name,
        description: addon.description,
        originalMonthlyPrice: addon.originalMonthlyPrice,
        monthlyPrice: addon.monthlyPrice,
        originalAnnualPrice: addon.originalAnnualPrice,
        annualPrice: addon.annualPrice,
        isActive: addon.isActive,
        sortOrder: addon.sortOrder,
      },
    });
  }

  // 4. Create or find Tenant
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Pratima Studio' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Pratima Studio',
        slug: 'pratima-studio',
        contactPhone: '+919999999999',
      },
    });
  }

  // 5. Create or find Branch
  let branch = await prisma.branch.findFirst({
    where: { name: 'Headquarters', tenantId: tenant.id },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Headquarters',
        isHeadOffice: true,
      },
    });
  }

  // 6. Link Existing Demo User
  const existingUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });
  let userId: string;
  if (existingUser) {
    console.log('Linking existing studio user:', existingUser.email);
    userId = existingUser.id;
  } else {
    console.log('Creating demo admin user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const newUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@pratimaerp.com',
        name: 'Admin User',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        isActive: true,
        canLogin: true,
      },
    });

    await prisma.userBranch.create({
      data: {
        userId: newUser.id,
        branchId: branch.id,
        isPrimary: true,
      },
    });

    userId = newUser.id;
  }

  // 7. Ensure RBAC role and permissions for demo tenant
  console.log('Ensuring TENANT_OWNER role for tenant admin...');
  let role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'TENANT_OWNER' },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'TENANT_OWNER',
        description: 'Tenant Owner / Administrator',
        isSystem: true,
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id },
    });
  }

  // 8. Create Lead Sources
  const sources = ['WEBSITE', 'INSTAGRAM', 'WALK_IN'];
  for (const source of sources) {
    const existingSource = await prisma.leadSource.findFirst({
      where: { name: source, tenantId: tenant.id },
    });
    if (!existingSource) {
      await prisma.leadSource.create({
        data: {
          tenantId: tenant.id,
          name: source,
          code: source,
          isActive: true,
        },
      });
    }
  }

  // 9. Create Clients
  const clientsToCreate = [
    { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@example.com', phone: '9876543210' },
    { firstName: 'Priya', lastName: 'Desai', email: 'priya@example.com', phone: '8765432109' },
  ];

  for (let i = 0; i < clientsToCreate.length; i++) {
    const c = clientsToCreate[i];
    const existingClient = await prisma.customer.findFirst({
      where: { email: c.email, tenantId: tenant.id },
    });
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
        },
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
    process.exit(0);
  });
