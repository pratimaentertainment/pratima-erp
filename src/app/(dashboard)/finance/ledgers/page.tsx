import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getChartOfAccountsAction } from '@/actions/accounting.actions';
import { LedgersClient } from './ledgers-client';

export const metadata = {
  title: 'Chart of Accounts (Ledgers) | FRAMIQ',
  description: 'Enterprise Double-Entry Chart of Accounts, Asset, Liability, Equity, Revenue, and Expense Ledgers.',
};

export default async function LedgersPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const result = await getChartOfAccountsAction();

  const initialData = result.success && result.data
    ? result.data
    : {
        all: [],
        grouped: {},
        summary: {
          totalAccounts: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          totalEquity: 0,
          totalRevenue: 0,
          totalExpenses: 0,
        },
      };

  return <LedgersClient initialData={initialData} />;
}
