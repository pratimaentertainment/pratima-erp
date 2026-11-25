import { auth } from '@/auth';
import { RoleRepository } from '@/repositories/role.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { redirect } from 'next/navigation';
import { PermissionMatrix } from '@/components/features/roles/permission-matrix';

export const metadata = {
  title: 'Permission Matrix | FRAMIQ',
};

export default async function PermissionMatrixPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) redirect('/login');

  const roleId = params.id;
  const role = await RoleRepository.getRoleWithPermissions(roleId, user.tenantId);
  
  if (!role) {
    redirect('/dashboard/roles');
  }

  const allPermissionsGrouped = await PermissionRepository.findAllGroupedByModule();
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          Permissions: {role.name}
        </h2>
        <p className="text-muted-foreground">
          {role.isSystem 
            ? 'This is a System role. Permissions cannot be modified.' 
            : 'Configure granular access permissions for this role.'}
        </p>
      </div>

      <PermissionMatrix 
        role={role} 
        groupedPermissions={allPermissionsGrouped} 
      />
    </div>
  );
}
