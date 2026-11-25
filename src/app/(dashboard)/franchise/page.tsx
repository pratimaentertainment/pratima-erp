import * as React from 'react';
import type { Metadata } from 'next';
import { getFranchisorDashboardAction } from '@/actions/franchise.actions';
import { FranchisorDashboardClient } from '@/components/features/franchise/FranchisorDashboardClient';
import { FeatureLockGate } from '@/components/billing/feature-lock-gate';

export const metadata: Metadata = {
  title: 'Franchise Network & Royalty Desk | FRAMIQ',
  description: 'Manage child franchisee studios, monitor network bookings, and govern auto-accrued royalties.',
};

export const dynamic = 'force-dynamic';

export default async function FranchisePage() {
  const result = await getFranchisorDashboardAction();

  if (!result.success || !result.data) {
    return (
      <FeatureLockGate
        featureKey="FRANCHISE_NETWORK"
        isUnlocked={false}
        customTitle="Enterprise Franchise Network Locked"
        customDescription={
          result.error ||
          'Your studio workspace is currently configured as a single studio. Franchise Network governance, multi-studio package replication, and auto-royalty ledgers are reserved for Enterprise Franchise plans.'
        }
      >
        <div />
      </FeatureLockGate>
    );
  }

  return (
    <div className="container max-w-7xl py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <FranchisorDashboardClient initialData={result.data} />
    </div>
  );
}
