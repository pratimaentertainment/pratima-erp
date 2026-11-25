import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RevenueClient } from './revenue-client';
import {
  getSaasRevenueAnalyticsAction,
  getBillingTransactionsLedgerAction,
  getOfflineBillingMetadataAction,
} from '@/actions/super-admin-billing.actions';

export const metadata: Metadata = {
  title: 'Revenue & Billing - Super Admin | FRAMIQ by Pratima Entertainment & Technology',
  description: 'SaaS platform revenue analytics, offline payment recording, and billing transaction ledger.',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminRevenuePage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user || userRole !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  // Parallel data fetching for immediate server render
  const [analyticsRes, ledgerRes, metadataRes] = await Promise.all([
    getSaasRevenueAnalyticsAction(),
    getBillingTransactionsLedgerAction(),
    getOfflineBillingMetadataAction(),
  ]);

  return (
    <RevenueClient
      initialAnalytics={
        analyticsRes.data || {
          totalCollectedRevenue: 0,
          currentMonthRevenue: 0,
          estimatedMrr: 0,
          estimatedArr: 0,
          activePaidTenantsCount: 0,
          trialTenantsCount: 0,
          totalTenantsCount: 0,
          conversionRate: 0,
        }
      }
      initialTransactions={ledgerRes.data || []}
      metadata={metadataRes.data || { tenants: [], plans: [] }}
    />
  );
}
