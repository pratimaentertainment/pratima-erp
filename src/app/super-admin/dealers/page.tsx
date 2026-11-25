import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DealersClient } from './dealers-client';
import { getSuperAdminDealersAction } from '@/actions/super-admin-dealer.actions';

export const metadata: Metadata = {
  title: 'Partner Network & Dealers - Super Admin | Pratima ERP',
  description: 'Admin-only dealer management, first-payment studio discounts, and automated recurring lifetime commissions.',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminDealersPage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user || userRole !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const res = await getSuperAdminDealersAction();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DealersClient
        initialDealers={res.data?.dealers || []}
        metrics={
          res.data?.metrics || {
            totalDealers: 0,
            activeDealers: 0,
            totalReferredStudios: 0,
            totalLifetimeCommissions: 0,
            totalPendingPayout: 0,
            totalPaidOut: 0,
          }
        }
      />
    </div>
  );
}
