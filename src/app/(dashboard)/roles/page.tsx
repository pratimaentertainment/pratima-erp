import { auth } from '@/auth';
import { RoleRepository } from '@/repositories/role.repository';
import { RoleTable } from '@/components/features/roles/role-table';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Roles | Pratima ERP',
};

export default async function RolesPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) redirect('/login');

  const roles = await RoleRepository.findRolesByTenant(user.tenantId);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <RoleTable data={roles} />
    </div>
  );
}
