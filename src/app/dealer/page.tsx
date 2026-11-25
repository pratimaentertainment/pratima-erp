import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getDealerPortalDataAction } from '@/actions/dealer-portal.actions';
import { DealerPortalClient } from './dealer-portal-client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Partner Portal | FRAMIQ by Pratima Entertainment & Technology',
  description: 'Dealer referral links, referred studios, recurring commission ledger, and bank payouts.',
};

export const dynamic = 'force-dynamic';

export default async function DealerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/dealer');
  }

  const role = (session.user as any)?.role;
  if (role !== 'DEALER' && role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const res = await getDealerPortalDataAction();

  if (!res.success || !res.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Partner Account Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {res.error || 'Your dealer profile has not been configured yet or is currently inactive.'}
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">Return to Login</Button>
        </Link>
      </div>
    );
  }

  return <DealerPortalClient data={res.data} />;
}
