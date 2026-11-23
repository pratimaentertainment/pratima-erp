export const PERMISSIONS = [
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

  // Workflows & Tasks
  { module: 'Shoots', action: 'View' },
  { module: 'Shoots', action: 'Create' },
  { module: 'Shoots', action: 'Update' },
  { module: 'Shoots', action: 'Delete' },
  
  { module: 'Workflow Tasks', action: 'View' },
  { module: 'Workflow Tasks', action: 'Create' },
  { module: 'Workflow Tasks', action: 'Update' },
  { module: 'Workflow Tasks', action: 'Delete' },

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

  // Phase 7 Modules
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
