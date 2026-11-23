import { prisma } from '@/lib/prisma';
import { PackageFormClient } from './package-form-client';
import { auth } from '@/auth';

export default async function CreatePackagePage() {
  const session = await auth();
  const user = session?.user as any;
  const tenantId = user?.tenantId;

  const categories = await prisma.packageCategory.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { name: 'asc' }
  });

  const taxRates = await prisma.taxRate.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { name: 'asc' }
  });

  const serviceComponents = await prisma.serviceComponent.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create Package</h1>
        <p className="text-muted-foreground">Configure a new service package.</p>
      </div>
      <PackageFormClient 
        categories={categories} 
        taxRates={taxRates} 
        serviceComponents={serviceComponents} 
      />
    </div>
  );
}
