import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALL_PERMISSIONS = [
  // UPPERCASE Module + Action permissions (used by Backend Services)
  { module: 'LEAD', action: 'READ' },
  { module: 'LEAD', action: 'VIEW' },
  { module: 'LEAD', action: 'CREATE' },
  { module: 'LEAD', action: 'UPDATE' },
  { module: 'LEAD', action: 'DELETE' },
  { module: 'LEAD', action: 'ASSIGN' },
  { module: 'LEAD', action: 'MANAGE' },

  { module: 'FOLLOW_UP', action: 'READ' },
  { module: 'FOLLOW_UP', action: 'VIEW' },
  { module: 'FOLLOW_UP', action: 'CREATE' },
  { module: 'FOLLOW_UP', action: 'UPDATE' },
  { module: 'FOLLOW_UP', action: 'DELETE' },
  { module: 'FOLLOW_UP', action: 'MANAGE' },

  { module: 'INQUIRY', action: 'READ' },
  { module: 'INQUIRY', action: 'VIEW' },
  { module: 'INQUIRY', action: 'CREATE' },
  { module: 'INQUIRY', action: 'UPDATE' },
  { module: 'INQUIRY', action: 'DELETE' },
  { module: 'INQUIRY', action: 'MANAGE' },

  { module: 'CUSTOMER', action: 'READ' },
  { module: 'CUSTOMER', action: 'VIEW' },
  { module: 'CUSTOMER', action: 'CREATE' },
  { module: 'CUSTOMER', action: 'UPDATE' },
  { module: 'CUSTOMER', action: 'DELETE' },
  { module: 'CUSTOMER', action: 'MANAGE' },

  { module: 'PACKAGE', action: 'READ' },
  { module: 'PACKAGE', action: 'VIEW' },
  { module: 'PACKAGE', action: 'CREATE' },
  { module: 'PACKAGE', action: 'UPDATE' },
  { module: 'PACKAGE', action: 'DELETE' },
  { module: 'PACKAGE', action: 'MANAGE' },

  { module: 'QUOTATION', action: 'READ' },
  { module: 'QUOTATION', action: 'VIEW' },
  { module: 'QUOTATION', action: 'CREATE' },
  { module: 'QUOTATION', action: 'UPDATE' },
  { module: 'QUOTATION', action: 'DELETE' },
  { module: 'QUOTATION', action: 'APPROVE' },
  { module: 'QUOTATION', action: 'MANAGE' },

  { module: 'PROJECT', action: 'READ' },
  { module: 'PROJECT', action: 'VIEW' },
  { module: 'PROJECT', action: 'CREATE' },
  { module: 'PROJECT', action: 'UPDATE' },
  { module: 'PROJECT', action: 'DELETE' },
  { module: 'PROJECT', action: 'MANAGE' },

  { module: 'SHOOT', action: 'READ' },
  { module: 'SHOOT', action: 'VIEW' },
  { module: 'SHOOT', action: 'CREATE' },
  { module: 'SHOOT', action: 'UPDATE' },
  { module: 'SHOOT', action: 'DELETE' },
  { module: 'SHOOT', action: 'MANAGE' },

  { module: 'EQUIPMENT', action: 'READ' },
  { module: 'EQUIPMENT', action: 'VIEW' },
  { module: 'EQUIPMENT', action: 'CREATE' },
  { module: 'EQUIPMENT', action: 'UPDATE' },
  { module: 'EQUIPMENT', action: 'DELETE' },
  { module: 'EQUIPMENT', action: 'MANAGE' },

  { module: 'WORKFLOW_TASK', action: 'READ' },
  { module: 'WORKFLOW_TASK', action: 'VIEW' },
  { module: 'WORKFLOW_TASK', action: 'CREATE' },
  { module: 'WORKFLOW_TASK', action: 'UPDATE' },
  { module: 'WORKFLOW_TASK', action: 'DELETE' },
  { module: 'WORKFLOW_TASK', action: 'MANAGE' },

  { module: 'USER', action: 'READ' },
  { module: 'USER', action: 'VIEW' },
  { module: 'USER', action: 'CREATE' },
  { module: 'USER', action: 'UPDATE' },
  { module: 'USER', action: 'DELETE' },
  { module: 'USER', action: 'MANAGE' },

  { module: 'ROLE', action: 'READ' },
  { module: 'ROLE', action: 'VIEW' },
  { module: 'ROLE', action: 'CREATE' },
  { module: 'ROLE', action: 'UPDATE' },
  { module: 'ROLE', action: 'DELETE' },
  { module: 'ROLE', action: 'MANAGE' },

  { module: 'BRANCH', action: 'READ' },
  { module: 'BRANCH', action: 'VIEW' },
  { module: 'BRANCH', action: 'CREATE' },
  { module: 'BRANCH', action: 'UPDATE' },
  { module: 'BRANCH', action: 'DELETE' },
  { module: 'BRANCH', action: 'MANAGE' },

  { module: 'TENANT', action: 'READ' },
  { module: 'TENANT', action: 'VIEW' },
  { module: 'TENANT', action: 'CREATE' },
  { module: 'TENANT', action: 'UPDATE' },
  { module: 'TENANT', action: 'DELETE' },
  { module: 'TENANT', action: 'MANAGE' },

  { module: 'MASTER_DATA', action: 'READ' },
  { module: 'MASTER_DATA', action: 'VIEW' },
  { module: 'MASTER_DATA', action: 'CREATE' },
  { module: 'MASTER_DATA', action: 'UPDATE' },
  { module: 'MASTER_DATA', action: 'DELETE' },
  { module: 'MASTER_DATA', action: 'MANAGE' },

  // UI Title-Case permissions (from seed-permissions.ts)
  { module: 'Tenants', action: 'View' },
  { module: 'Tenants', action: 'Create' },
  { module: 'Tenants', action: 'Update' },
  { module: 'Tenants', action: 'Delete' },
  { module: 'Tenants', action: 'Manage Billing' },

  { module: 'Roles', action: 'View' },
  { module: 'Roles', action: 'Create' },
  { module: 'Roles', action: 'Update' },
  { module: 'Roles', action: 'Delete' },
  { module: 'Roles', action: 'Clone' },
  { module: 'Roles', action: 'Manage Permissions' },

  { module: 'Users', action: 'View' },
  { module: 'Users', action: 'Create' },
  { module: 'Users', action: 'Update' },
  { module: 'Users', action: 'Delete' },
  { module: 'Users', action: 'Assign Roles' },
  { module: 'Users', action: 'View Effective Permissions' },

  { module: 'Leads', action: 'View' },
  { module: 'Leads', action: 'Create' },
  { module: 'Leads', action: 'Update' },
  { module: 'Leads', action: 'Delete' },
  { module: 'Leads', action: 'Assign' },

  { module: 'Quotations', action: 'View' },
  { module: 'Quotations', action: 'Create' },
  { module: 'Quotations', action: 'Approve' },
  { module: 'Quotations', action: 'Update' },
  { module: 'Quotations', action: 'Delete' },

  { module: 'Packages', action: 'View' },
  { module: 'Packages', action: 'Manage' },
  { module: 'Packages', action: 'Create' },
  { module: 'Packages', action: 'Update' },
  { module: 'Packages', action: 'Delete' },

  { module: 'Projects', action: 'View' },
  { module: 'Projects', action: 'Create' },
  { module: 'Projects', action: 'Update' },
  { module: 'Projects', action: 'Delete' },
  { module: 'Agreements', action: 'View' },
  { module: 'Agreements', action: 'Manage' },

  { module: 'Attendance', action: 'View' },
  { module: 'Attendance', action: 'Manage' },
  { module: 'Leaves', action: 'View' },
  { module: 'Leaves', action: 'Approve' },
  { module: 'Payroll', action: 'View' },
  { module: 'Payroll', action: 'Manage' },

  { module: 'Invoices', action: 'View' },
  { module: 'Invoices', action: 'Create' },
  { module: 'Invoices', action: 'Print' },
  { module: 'Invoices', action: 'Download' },
  { module: 'Payments', action: 'View' },
  { module: 'Payments', action: 'Manage' },

  { module: 'Equipment', action: 'View' },
  { module: 'Equipment', action: 'Manage' },
  { module: 'Vehicles', action: 'View' },
  { module: 'Vehicles', action: 'Manage' },
  { module: 'Vendors', action: 'View' },
  { module: 'Vendors', action: 'Manage' },

  { module: 'Master Data', action: 'View' },
  { module: 'Master Data', action: 'Create' },
  { module: 'Master Data', action: 'Update' },
  { module: 'Master Data', action: 'Delete' },

  { module: 'Customers', action: 'View' },
  { module: 'Customers', action: 'Create' },
  { module: 'Customers', action: 'Update' },
  { module: 'Customers', action: 'Delete' },

  { module: 'Inquiries', action: 'View' },
  { module: 'Inquiries', action: 'Create' },
  { module: 'Inquiries', action: 'Update' },
  { module: 'Inquiries', action: 'Delete' },

  { module: 'Follow Ups', action: 'View' },
  { module: 'Follow Ups', action: 'Create' },
  { module: 'Follow Ups', action: 'Update' },
  { module: 'Follow Ups', action: 'Delete' },
];

async function main() {
  console.log('--- RESTORING ENTERPRISE RBAC & ADMIN PERMISSIONS ---');

  // 1. Ensure Tenant
  let tenant = await prisma.tenant.findFirst({
    where: { deletedAt: null }
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Pratima Studio',
        code: 'PRATIMA',
        slug: 'pratima-studio',
      }
    });
    console.log('Created primary Tenant:', tenant.name, tenant.id);
  } else {
    console.log('Using existing Tenant:', tenant.name, tenant.id);
  }

  // 2. Ensure Head Office Branch
  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, deletedAt: null }
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Headquarters',
        isHeadOffice: true,
        isActive: true,
      }
    });
    console.log('Created primary Branch:', branch.name, branch.id);
  } else {
    console.log('Using existing Branch:', branch.name, branch.id);
  }

  // 3. Upsert Permissions
  console.log(`Seeding ${ALL_PERMISSIONS.length} permission entries...`);
  const seededPermissionIds = [];
  for (const perm of ALL_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: {
        module_action: {
          module: perm.module,
          action: perm.action,
        }
      },
      update: {
        name: `${perm.module}:${perm.action}`
      },
      create: {
        name: `${perm.module}:${perm.action}`,
        module: perm.module,
        action: perm.action,
      }
    });
    seededPermissionIds.push(p.id);
  }
  console.log(`Permissions successfully seeded: ${seededPermissionIds.length}`);

  // 4. Ensure SUPER_ADMIN Role exists for Tenant
  let superAdminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'SUPER_ADMIN' }
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full system permissions',
        isSystem: true,
      }
    });
    console.log('Created SUPER_ADMIN role:', superAdminRole.id);
  } else {
    console.log('Found existing SUPER_ADMIN role:', superAdminRole.id);
  }

  // Also ensure "Super Admin" name variation exists if searched by display name
  let displayAdminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'Super Admin' }
  });
  if (!displayAdminRole) {
    displayAdminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Super Admin',
        description: 'Super Administrator',
        isSystem: true,
      }
    });
  }

  // 5. Attach ALL permissions to SUPER_ADMIN & Super Admin roles
  const rolesToGrant = [superAdminRole, displayAdminRole];
  for (const r of rolesToGrant) {
    for (const permId of seededPermissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: r.id,
            permissionId: permId,
          }
        },
        update: {},
        create: {
          roleId: r.id,
          permissionId: permId,
        }
      });
    }
  }
  console.log('Granted all permissions to Administrator roles.');

  // 6. Ensure Users are linked to Tenant, Branch, and assigned SUPER_ADMIN
  let users = await prisma.user.findMany({
    where: { deletedAt: null }
  });

  if (users.length === 0) {
    console.log('No existing users found. Creating default admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const defaultUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@pratimaerp.com',
        name: 'Administrator',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
      }
    });
    users = [defaultUser];
  }

  for (const user of users) {
    console.log(`Configuring access for User: ${user.email} (${user.id})`);

    // Ensure Tenant
    if (user.tenantId !== tenant.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id }
      });
    }

    // Ensure Primary UserBranch
    const ub = await prisma.userBranch.findFirst({
      where: { userId: user.id, branchId: branch.id }
    });
    if (!ub) {
      await prisma.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        }
      });
    }

    // Ensure SUPER_ADMIN UserRole
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: superAdminRole.id,
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: superAdminRole.id,
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: displayAdminRole.id,
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: displayAdminRole.id,
      }
    });
  }

  console.log('=== ADMIN PERMISSIONS AND ROLES RESTORED 100% ===');
}

main()
  .catch((err) => {
    console.error('Failed to seed admin permissions:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
