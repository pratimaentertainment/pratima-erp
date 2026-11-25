import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPendingFreelancerPayoutsAction } from '@/actions/payout.actions';
import { FreelancerPayoutWorkbench } from '@/components/features/finance/payouts/freelancer-payout-workbench';

export const metadata = {
  title: 'Freelancer Crew Payouts & TDS | FRAMIQ',
  description: 'Multi-mode disbursement workbench for freelance photographers, cinematographers, and crew with statutory TDS withholding.',
};

export default async function FreelancerPayoutsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const payoutsRes = await getPendingFreelancerPayoutsAction();

  const data = payoutsRes.success && payoutsRes.data
    ? payoutsRes.data
    : {
        pendingPayouts: [],
        sourceAccounts: [],
        isTdsEnabled: false,
      };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Freelancer Crew Payouts & TDS</h2>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              Disbursement Engine
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Disburse pending crew payouts across Bank (NEFT/RTGS), UPI, and Cash with automated Section 194J/194C TDS withholding and real-time double-entry voucher posting.
          </p>
        </div>
      </div>

      <FreelancerPayoutWorkbench
        initialPendingPayouts={data.pendingPayouts}
        initialSourceAccounts={data.sourceAccounts}
        isTdsEnabled={data.isTdsEnabled}
      />
    </div>
  );
}
