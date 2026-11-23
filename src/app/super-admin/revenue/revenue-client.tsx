'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/currency';
import { RecordOfflinePaymentDialog } from './record-offline-payment-dialog';
import {
  getSaasRevenueAnalyticsAction,
  getBillingTransactionsLedgerAction,
} from '@/actions/super-admin-billing.actions';
import { toast } from 'sonner';

interface RevenueClientProps {
  initialAnalytics: any;
  initialTransactions: any[];
  metadata: {
    tenants: any[];
    plans: any[];
  };
}

export function RevenueClient({
  initialAnalytics,
  initialTransactions,
  metadata,
}: RevenueClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [transactions, setTransactions] = useState<any[]>(initialTransactions || []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reloadData = () => {
    startTransition(async () => {
      const [analyticsRes, ledgerRes] = await Promise.all([
        getSaasRevenueAnalyticsAction(),
        getBillingTransactionsLedgerAction({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          paymentMode: modeFilter !== 'ALL' ? modeFilter : undefined,
        }),
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (ledgerRes.success) setTransactions(ledgerRes.data);
      router.refresh();
    });
  };

  const handleCopyRef = (refText: string, id: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedId(id);
    toast.success('Reference ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered transactions for quick client search
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.studioName?.toLowerCase().includes(search.toLowerCase()) ||
      tx.studioSlug?.toLowerCase().includes(search.toLowerCase()) ||
      tx.transactionRef?.toLowerCase().includes(search.toLowerCase()) ||
      tx.planName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const matchesMode = modeFilter === 'ALL' || tx.paymentMode === modeFilter;

    return matchesSearch && matchesStatus && matchesMode;
  });

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
              SaaS Revenue Desk &amp; Billing
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] tracking-wider uppercase font-mono border-primary/30 text-primary bg-primary/5"
            >
              Enterprise Finance
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform revenue ledger, B2B offline payment recording, recurring MRR/ARR analytics, and transaction auditing.
          </p>
        </div>

        {/* Action: Record Offline Payment Modal */}
        <div className="flex items-center gap-3">
          <RecordOfflinePaymentDialog
            tenants={metadata.tenants}
            plans={metadata.plans}
            onPaymentSuccess={reloadData}
          />
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Platform Revenue
            </CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-heading text-foreground">
              {formatMoney(analytics?.totalCollectedRevenue || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Lifetime successful transactions
            </p>
          </CardContent>
        </Card>

        {/* Current Month Revenue */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Month
            </CardTitle>
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-heading text-primary">
              {formatMoney(analytics?.currentMonthRevenue || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Collected this calendar month
            </p>
          </CardContent>
        </Card>

        {/* Estimated MRR / ARR */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estimated MRR &bull; ARR
            </CardTitle>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-heading text-foreground">
              {formatMoney(analytics?.estimatedMrr || 0)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>ARR: <strong>{formatMoney(analytics?.estimatedArr || 0)}</strong></span>
            </p>
          </CardContent>
        </Card>

        {/* Active Paid Studios / Conversion */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paid Studios &bull; Conversion
            </CardTitle>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-heading text-foreground">
              {analytics?.activePaidTenantsCount || 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                / {analytics?.totalTenantsCount || 0}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {analytics?.conversionRate || 0}% Conversion &bull; {analytics?.trialTenantsCount || 0} Trials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Ledger Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        {/* Ledger Toolbar */}
        <CardHeader className="bg-muted/20 border-b border-border/60 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Billing Transactions Ledger</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete history of online Razorpay payments and offline B2B wire transfers across all studios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search studio, UTR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border bg-background text-foreground"
            >
              <option value="ALL">All Modes</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT / Bank</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border bg-background text-foreground"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={reloadData}
              disabled={isPending}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>

        {/* Ledger Content Table */}
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No billing transactions found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Record manual B2B payments using the button above or wait for studio online checkouts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b font-medium">
                  <tr>
                    <th className="p-3.5 pl-6">Date &amp; Time</th>
                    <th className="p-3.5">Photography Studio</th>
                    <th className="p-3.5">Plan Tier</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5">Reference / Gateway ID</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-6">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map((tx) => {
                    const isCopied = copiedId === tx.id;
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        {/* Date */}
                        <td className="p-3.5 pl-6 whitespace-nowrap text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(tx.transactionDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Studio */}
                        <td className="p-3.5">
                          <div className="font-semibold text-foreground">{tx.studioName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            /{tx.studioSlug}
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="p-3.5">
                          <span className="font-medium text-foreground">{tx.planName}</span>
                        </td>

                        {/* Amount */}
                        <td className="p-3.5 font-bold text-foreground text-sm">
                          {formatMoney(tx.amount)}
                        </td>

                        {/* Payment Mode */}
                        <td className="p-3.5">
                          {tx.paymentMode === 'RAZORPAY' && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
                              Razorpay
                            </Badge>
                          )}
                          {tx.paymentMode === 'UPI' && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold">
                              UPI
                            </Badge>
                          )}
                          {tx.paymentMode === 'NEFT' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold">
                              NEFT / Bank
                            </Badge>
                          )}
                          {tx.paymentMode === 'CASH' && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">
                              Cash
                            </Badge>
                          )}
                          {tx.paymentMode === 'CHEQUE' && (
                            <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 font-semibold">
                              Cheque
                            </Badge>
                          )}
                        </td>

                        {/* Reference / UTR ID */}
                        <td className="p-3.5 font-mono text-[11px]">
                          {tx.transactionRef ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[150px]">{tx.transactionRef}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyRef(tx.transactionRef, tx.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy Reference"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Direct</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          {tx.status === 'SUCCESS' && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                              ✓ Success
                            </Badge>
                          )}
                          {tx.status === 'PENDING' && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold">
                              Pending
                            </Badge>
                          )}
                          {tx.status === 'FAILED' && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-semibold">
                              Failed
                            </Badge>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="p-3.5 text-right pr-6 max-w-[180px] truncate text-muted-foreground">
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
