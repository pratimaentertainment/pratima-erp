import { getTenantProfileAction } from '@/app/actions/tenant.actions';
import { TenantForm } from './tenant-form';
import { redirect } from 'next/navigation';

export default async function TenantSettingsPage() {
  const result = await getTenantProfileAction();
  
  if (!result.success || !result.data) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tenant Profile</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <TenantForm initialData={result.data} />
        </div>
      </div>
    </div>
  );
}
