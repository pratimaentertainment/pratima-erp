import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listAllSelectionBoardsAction } from '@/actions/selection.actions';
import { SelectionBoardsClient } from './selection-boards-client';
import { FeatureLockGate } from '@/components/billing/feature-lock-gate';
import { getTenantEntitlements } from '@/services/billing/entitlement.service';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Client Photo Selections | Pratima ERP',
  description: 'Manage client photo proofing boards, deadline extensions, and editor Lightroom exports.',
};

function SelectionBoardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="pt-2 border-t flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function SelectionBoardsDataLoader() {
  const result = await listAllSelectionBoardsAction();
  const initialBoards = result.success && result.data ? (result.data as any[]) : [];

  return <SelectionBoardsClient initialBoards={initialBoards} />;
}

export default async function SelectionBoardsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  let isUnlocked = isSuperAdmin;
  if (!isUnlocked && user.tenantId) {
    const entitlements = await getTenantEntitlements(user.tenantId);
    isUnlocked = entitlements.features.includes('CLIENT_PROOFING');
  }

  return (
    <FeatureLockGate featureKey="CLIENT_PROOFING" isUnlocked={isUnlocked}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/operations"
            className="p-2 border rounded-lg hover:bg-accent transition-colors"
            title="Back to Operations"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client Photo Selections</h1>
            <p className="text-muted-foreground mt-1">
              Digital proofing boards, client approval tracking, deadline extensions, and Lightroom editor exports.
            </p>
          </div>
        </div>

        <Suspense fallback={<SelectionBoardsSkeleton />}>
          <SelectionBoardsDataLoader />
        </Suspense>
      </div>
    </FeatureLockGate>
  );
}
