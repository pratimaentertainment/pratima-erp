import { prisma } from '../src/lib/prisma';

const PERMISSIONS = [
  // Tenants & Billing
  { module: 'Tenants', action: 'View' },
  { module: 'Tenants', action: 'Create' },
  { module: 'Tenants', action: 'Update' },
  { module: 'Tenants', action: 'Delete' },
  { module: 'Tenants', action: 'Manage Billing' },
  
  // Roles & Permissions
  { module: 'Roles', action: 'View' },
  { module: 'Roles', action: 'Create' },
  { module: 'Roles', action: 'Update' },
  { module: 'Roles', action: 'Delete' },
  { module: 'Roles', action: 'Clone' },
  { module: 'Roles', action: 'Manage Permissions' },

  // Users
  { module: 'Users', action: 'View' },
  { module: 'Users', action: 'Create' },
  { module: 'Users', action: 'Update' },
  { module: 'Users', action: 'Delete' },
  { module: 'Users', action: 'Assign Roles' },
  { module: 'Users', action: 'View Effective Permissions' },

  // Sales & Lead Management
  { module: 'Leads', action: 'View' },
  { module: 'Leads', action: 'Create' },
  { module: 'Leads', action: 'Update' },
  { module: 'Leads', action: 'Delete' },
  { module: 'Leads', action: 'Assign' },
  { module: 'Quotations', action: 'View' },
  { module: 'Quotations', action: 'Create' },
  { module: 'Quotations', action: 'Approve' },
  { module: 'Packages', action: 'View' },
  { module: 'Packages', action: 'Manage' },
  
  // Projects & Operations
  { module: 'Projects', action: 'View' },
  { module: 'Projects', action: 'Create' },
  { module: 'Projects', action: 'Update' },
  { module: 'Projects', action: 'Delete' },
  { module: 'Agreements', action: 'View' },
  { module: 'Agreements', action: 'Manage' },

  // Workflows
  { module: 'Editing Workflow', action: 'View' },
  { module: 'Editing Workflow', action: 'Update' },
  { module: 'Editing Workflow', action: 'Assign' },
  { module: 'Video Workflow', action: 'View' },
  { module: 'Video Workflow', action: 'Update' },
  { module: 'Album Workflow', action: 'View' },
  { module: 'Album Workflow', action: 'Update' },

  // HR & Payroll
  { module: 'Attendance', action: 'View' },
  { module: 'Attendance', action: 'Manage' },
  { module: 'Leaves', action: 'View' },
  { module: 'Leaves', action: 'Approve' },
  { module: 'Payroll', action: 'View' },
  { module: 'Payroll', action: 'Manage' },

  // Finance
  { module: 'Invoices', action: 'View' },
  { module: 'Invoices', action: 'Create' },
  { module: 'Invoices', action: 'Print' },
  { module: 'Invoices', action: 'Download' },
  { module: 'Payments', action: 'View' },
  { module: 'Payments', action: 'Manage' },

  // Assets & Vehicles
  { module: 'Equipment', action: 'View' },
  { module: 'Equipment', action: 'Manage' },
  { module: 'Vehicles', action: 'View' },
  { module: 'Vehicles', action: 'Manage' },
  { module: 'Vendors', action: 'View' },
  { module: 'Vendors', action: 'Manage' },
];

async function seed() {
  console.log('Seeding permissions...');
  let createdCount = 0;
  for (const perm of PERMISSIONS) {
    const name = `${perm.action} ${perm.module}`;
    
    // Check if it exists
    const existing = await prisma.permission.findFirst({
      where: { module: perm.module, action: perm.action }
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          name,
          module: perm.module,
          action: perm.action
        }
      });
      createdCount++;
      console.log(`Created: ${name}`);
    }
  }
  
  console.log(`Finished seeding permissions. ${createdCount} created.`);
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
