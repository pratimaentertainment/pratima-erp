import React, { Suspense } from 'react';
import { CustomerService } from '@/services/customer.service';
import { CustomerClient } from './customer-client';
import { MasterService } from '@/services/master.service';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Customers | FRAMIQ',
  description: 'Manage your enterprise customer database.',
};

function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="divide-y">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function CustomersData() {
  const [customers, states, cities] = await Promise.all([
    CustomerService.findAll(),
    MasterService.findAll('state'),
    MasterService.findAll('city'),
  ]);

  const activeStates = (states as Array<{ id: string; name: string; isActive?: boolean }>).filter(
    (s) => s.isActive
  );
  const activeCities = (cities as Array<{ id: string; name: string; stateId?: string; isActive?: boolean }>).filter(
    (c) => c.isActive
  );

  return <CustomerClient initialData={customers} states={activeStates} cities={activeCities} />;
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-2">
          Manage your enterprise customer database.
        </p>
      </div>

      <Suspense fallback={<CustomersSkeleton />}>
        <CustomersData />
      </Suspense>
    </div>
  );
}
