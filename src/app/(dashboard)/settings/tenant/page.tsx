import { getTenantProfileAction } from '@/actions/tenant.actions';
import { TenantForm } from './tenant-form';
import { redirect } from 'next/navigation';

export default async function TenantSettingsPage() {
  const result = await getTenantProfileAction();
  
  if (!result.success || !result.data) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Tenant Profile & Storefront SEO</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your main business identity and Google My Business integration for your storefront.
        </p>
      </div>
      
      <TenantForm initialData={result.data} />
    </div>
  );
}
