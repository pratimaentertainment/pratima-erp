 
 
import { Suspense } from 'react';
import { UserService } from '@/services/user.service';
import { RoleRepository } from '@/repositories/role.repository';
import { auth } from '@/auth';
import { DataTable } from '@/components/features/users/user-table';
import { columns } from '@/components/features/users/columns';
import { UserDrawer } from '@/components/features/users/user-drawer';
import { UserFilters } from '@/components/features/users/user-filters';

export const metadata = {
  title: 'User Management - Pratima ERP',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  
  // Use a fallback tenant if auth is not strictly configured yet
  const tenantId = (session?.user as any)?.tenantId || 'default-tenant-id';

  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const roleId = typeof searchParams.role === 'string' ? searchParams.role : undefined;

  // Fetch initial data
  const [usersData, roles] = await Promise.all([
    UserService.getUsers(tenantId, { take: 50, search, status, roleId }),
    RoleRepository.findRolesByTenant(tenantId)
  ]);
  const { users, total } = usersData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and branch assignments.
          </p>
        </div>
        <UserDrawer roles={roles} />
      </div>

      <div className="bg-card shadow rounded-xl p-6 border text-card-foreground">
        <UserFilters roles={roles} />
        <Suspense fallback={<div>Loading users...</div>}>
          <DataTable columns={columns} data={users} roles={roles} />
        </Suspense>
      </div>
    </div>
  );
}
