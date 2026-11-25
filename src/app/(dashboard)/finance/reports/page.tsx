import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  getTrialBalanceAction,
  getProfitAndLossAction,
  getBalanceSheetAction,
} from '@/actions/accounting.actions';
import { ReportsClient } from './reports-client';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureLockGate } from '@/components/billing/feature-lock-gate';
import { getTenantEntitlements } from '@/services/billing/entitlement.service';

export const metadata = {
  title: 'Chartered Accountant Financial Reports | FRAMIQ',
  description: '1-Click CA Audit & Tax Financial Statements: Trial Balance, Profit & Loss, and Balance Sheet.',
};

function ReportsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="border rounded-xl bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <Skeleton className="h-5 w-60" />
              <div className="flex items-center gap-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function ReportsDataLoader() {
  const [tbRes, plRes, bsRes] = await Promise.all([
    getTrialBalanceAction(),
    getProfitAndLossAction(),
    getBalanceSheetAction(),
  ]);

  const initialTrialBalance = tbRes.success && tbRes.data ? tbRes.data : null;
  const initialProfitAndLoss = plRes.success && plRes.data ? plRes.data : null;
  const initialBalanceSheet = bsRes.success && bsRes.data ? bsRes.data : null;

  return (
    <ReportsClient
      initialTrialBalance={initialTrialBalance}
      initialProfitAndLoss={initialProfitAndLoss}
      initialBalanceSheet={initialBalanceSheet}
    />
  );
}

export default async function FinancialReportsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  let isUnlocked = isSuperAdmin;
  if (!isUnlocked && user.tenantId) {
    const entitlements = await getTenantEntitlements(user.tenantId);
    isUnlocked = entitlements.features.includes('ADVANCED_ANALYTICS');
  }

  return (
    <FeatureLockGate featureKey="ADVANCED_ANALYTICS" isUnlocked={isUnlocked}>
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsDataLoader />
      </Suspense>
    </FeatureLockGate>
  );
}
