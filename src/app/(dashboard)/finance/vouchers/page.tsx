import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getVouchersAction, getChartOfAccountsAction } from '@/actions/accounting.actions';
import { VouchersClient } from './vouchers-client';

export const metadata = {
  title: 'Financial Daybook & Vouchers | FRAMIQ',
  description: 'Enterprise Double-Entry Voucher System: Payments, Receipts, Contra, and Daily Expenses.',
};

export default async function VouchersPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const [vouchersRes, accountsRes] = await Promise.all([
    getVouchersAction(),
    getChartOfAccountsAction(),
  ]);

  const vouchersData = vouchersRes.success && vouchersRes.data
    ? vouchersRes.data
    : {
        vouchers: [],
        summary: {
          totalCount: 0,
          totalPayments: 0,
          totalReceipts: 0,
          totalContra: 0,
          totalJournals: 0,
        },
      };

  const accounts = accountsRes.success && accountsRes.data
    ? accountsRes.data.all || []
    : [];

  return (
    <VouchersClient
      initialVouchers={vouchersData.vouchers}
      initialSummary={vouchersData.summary}
      accounts={accounts}
    />
  );
}
