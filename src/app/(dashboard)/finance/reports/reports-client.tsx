'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
  Wallet,
  Receipt,
  Layers,
  Sparkles,
  RefreshCw,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getTrialBalanceAction,
  getProfitAndLossAction,
  getBalanceSheetAction,
} from '@/actions/accounting.actions';

interface ReportsClientProps {
  initialTrialBalance: any;
  initialProfitAndLoss: any;
  initialBalanceSheet: any;
}

export function ReportsClient({
  initialTrialBalance,
  initialProfitAndLoss,
  initialBalanceSheet,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'tb' | 'pl' | 'bs'>('tb');
  const [trialBalance, setTrialBalance] = useState(initialTrialBalance);
  const [profitAndLoss, setProfitAndLoss] = useState(initialProfitAndLoss);
  const [balanceSheet, setBalanceSheet] = useState(initialBalanceSheet);

  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [isRefreshing, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  // Currency Formatter in INR
  const formatINR = (val: number | null | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Date range calculator based on preset
  const getDateRange = (preset: string) => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    } else if (preset === 'THIS_QUARTER') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    } else if (preset === 'FY_CURRENT') {
      // Indian FY starts April 1
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(year, 3, 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    return { startDate: null, endDate: null };
  };

  // Refresh reports
  const handleRefresh = (preset = datePreset) => {
    startTransition(async () => {
      try {
        const { startDate, endDate } = getDateRange(preset);

        const [tbRes, plRes, bsRes] = await Promise.all([
          getTrialBalanceAction({ startDate, endDate }),
          getProfitAndLossAction({ startDate, endDate }),
          getBalanceSheetAction({ asOfDate: endDate }),
        ]);

        if (tbRes.success && tbRes.data) setTrialBalance(tbRes.data);
        if (plRes.success && plRes.data) setProfitAndLoss(plRes.data);
        if (bsRes.success && bsRes.data) setBalanceSheet(bsRes.data);

        toast.success('Financial statements refreshed!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to refresh financial statements');
      }
    });
  };

  // 1-Click Export for Chartered Accountant (CA)
  const handleExportForCA = () => {
    setIsExporting(true);
    try {
      const nowFormatted = formatDate(new Date(), 'dd-MM-yyyy hh:mm a');

      // Build structured CSV / audit schedule
      let content = `========================================================================\n`;
      content += `PRATIMA ERP - CHARTERED ACCOUNTANT (CA) FINANCIAL AUDIT REPORT\n`;
      content += `Generated On: ${nowFormatted}\n`;
      content += `Reporting Basis: Accrual / Double-Entry General Ledger\n`;
      content += `========================================================================\n\n`;

      // 1. TRIAL BALANCE
      content += `SECTION 1: TRIAL BALANCE STATEMENT\n`;
      content += `Status: ${trialBalance.isBalanced ? 'PERFECTLY BALANCED' : 'IMBALANCE DETECTED'}\n`;
      content += `Code,Account Name,Classification,Total Debits,Total Credits,Closing Debit,Closing Credit\n`;
      for (const r of trialBalance.rows || []) {
        content += `"${r.code}","${r.name}","${r.type}",${r.totalDebit},${r.totalCredit},${r.closingDebit},${r.closingCredit}\n`;
      }
      content += `TOTALS,,,,,,Debit: ₹${trialBalance.totalClosingDebit.toFixed(2)},Credit: ₹${trialBalance.totalClosingCredit.toFixed(2)}\n\n`;

      // 2. PROFIT & LOSS
      content += `SECTION 2: PROFIT & LOSS STATEMENT (INCOME STATEMENT)\n`;
      content += `A. OPERATING REVENUE\n`;
      for (const item of profitAndLoss.revenueItems || []) {
        content += `"${item.code}","${item.name}",₹${item.amount.toFixed(2)}\n`;
      }
      content += `TOTAL REVENUE: ₹${profitAndLoss.totalRevenue.toFixed(2)}\n\n`;

      content += `B. DIRECT PRODUCTION / SHOOT EXPENSES (COGS)\n`;
      for (const item of profitAndLoss.directExpenseItems || []) {
        content += `"${item.code}","${item.name}",₹${item.amount.toFixed(2)}\n`;
      }
      content += `TOTAL DIRECT SHOOT EXPENSES: ₹${profitAndLoss.totalDirectExpenses.toFixed(2)}\n`;
      content += `GROSS PROFIT: ₹${profitAndLoss.grossProfit.toFixed(2)} (${profitAndLoss.grossMarginPercent.toFixed(1)}% Margin)\n\n`;

      content += `C. INDIRECT OVERHEADS & OPERATING EXPENSES\n`;
      for (const item of profitAndLoss.operatingExpenseItems || []) {
        content += `"${item.code}","${item.name}",₹${item.amount.toFixed(2)}\n`;
      }
      content += `TOTAL OPERATING EXPENSES: ₹${profitAndLoss.totalOperatingExpenses.toFixed(2)}\n`;
      content += `TOTAL EXPENSES: ₹${profitAndLoss.totalExpenses.toFixed(2)}\n`;
      content += `NET PROFIT / LOSS: ₹${profitAndLoss.netProfit.toFixed(2)} (${profitAndLoss.netMarginPercent.toFixed(1)}% Margin)\n\n`;

      // 3. BALANCE SHEET
      content += `SECTION 3: BALANCE SHEET STATEMENT\n`;
      content += `Status: ${balanceSheet.isBalanced ? 'PERFECTLY BALANCED (Assets = Liabilities + Equity)' : 'RECONCILING'}\n`;
      content += `CURRENT ASSETS: ₹${balanceSheet.totalCurrentAssets.toFixed(2)}\n`;
      content += `FIXED GEAR ASSETS: ₹${balanceSheet.totalFixedAssets.toFixed(2)}\n`;
      content += `TOTAL ASSETS: ₹${balanceSheet.totalAssets.toFixed(2)}\n\n`;

      content += `CURRENT LIABILITIES: ₹${balanceSheet.totalLiabilities.toFixed(2)}\n`;
      content += `OWNER CAPITAL & DRAWINGS: ₹${balanceSheet.totalEquityWithoutProfit.toFixed(2)}\n`;
      content += `NET RETAINED PROFIT TO DATE: ₹${balanceSheet.netRetainedProfit.toFixed(2)}\n`;
      content += `TOTAL LIABILITIES & OWNER EQUITY: ₹${balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}\n`;
      content += `========================================================================\n`;

      // Trigger Browser Download as .txt / .csv
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pratima_ERP_CA_Audit_Bundle_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Also copy to clipboard for immediate paste
      navigator.clipboard.writeText(content);

      toast.success('CA Financial Audit Package Generated!', {
        description: 'Downloaded report file and copied audit schedules to clipboard.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to export report for CA');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Financial Reports & CA Audit Schedule</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Step 3 Accounting
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time double-entry Trial Balance, Profit & Loss Statement, and Balance Sheet with 1-click audit exports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={datePreset}
            onValueChange={(val) => {
              if (val) {
                setDatePreset(val);
                handleRefresh(val);
              }
            }}
          >
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="FY_CURRENT">Current FY (2026-27)</SelectItem>
              <SelectItem value="THIS_QUARTER">Current Quarter</SelectItem>
              <SelectItem value="THIS_MONTH">Current Month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefresh(datePreset)}
            disabled={isRefreshing}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportForCA}
            disabled={isExporting}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            1-Click Export for CA
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {/* Gross Profit */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Gross Profit</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground">
              {formatINR(profitAndLoss.grossProfit)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profitAndLoss.grossMarginPercent.toFixed(1)}% Gross Margin
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Net Profit / Loss</span>
              {profitAndLoss.netProfit >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div
              className={`text-2xl font-bold ${
                profitAndLoss.netProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(profitAndLoss.netProfit)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profitAndLoss.netMarginPercent.toFixed(1)}% Net Margin
            </p>
          </CardContent>
        </Card>

        {/* Total Assets */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Assets</span>
              <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground">
              {formatINR(balanceSheet.totalAssets)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Cash, bank & studio gear
            </p>
          </CardContent>
        </Card>

        {/* Trial Balance Health */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Double-Entry Health</span>
              <Scale className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-1.5 mt-0.5">
              {trialBalance.isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    Balanced
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    Imbalance
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {trialBalance.rows?.length || 0} Ledgers reconciled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Statement Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="space-y-6"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tb" className="text-xs">
              Trial Balance
            </TabsTrigger>
            <TabsTrigger value="pl" className="text-xs">
              Profit & Loss (P&L)
            </TabsTrigger>
            <TabsTrigger value="bs" className="text-xs">
              Balance Sheet
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: TRIAL BALANCE */}
        <TabsContent value="tb" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Trial Balance Schedule</h3>
              <p className="text-xs text-muted-foreground">
                Reconciliation of all ledger debit and credit closing balances.
              </p>
            </div>

            {trialBalance.isBalanced ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Double-Entry Reconciled (Diff: ₹0.00)</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 text-xs"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Out of Balance by {formatINR(trialBalance.difference)}</span>
              </Badge>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Ledger Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Period Debit (₹)</TableHead>
                  <TableHead className="text-right">Period Credit (₹)</TableHead>
                  <TableHead className="text-right">Closing Debit (₹)</TableHead>
                  <TableHead className="text-right">Closing Credit (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.rows?.map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">
                      {row.code}
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatINR(row.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatINR(row.totalCredit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {row.closingDebit > 0 ? formatINR(row.closingDebit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      {row.closingCredit > 0 ? formatINR(row.closingCredit) : '—'}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={3} className="text-xs uppercase">
                    Grand Totals (Trial Balance)
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatINR(trialBalance.totalPeriodDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatINR(trialBalance.totalPeriodCredit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-blue-600 dark:text-blue-400">
                    {formatINR(trialBalance.totalClosingDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-amber-600 dark:text-amber-400">
                    {formatINR(trialBalance.totalClosingCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 2: PROFIT & LOSS */}
        <TabsContent value="pl" className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Profit & Loss Statement (Income Statement)
            </h3>
            <p className="text-xs text-muted-foreground">
              Revenue generated vs. direct shoot execution expenses & studio operating overheads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Operating Revenue */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <TrendingUp className="h-4 w-4" />
                    Operating Revenue / Sales
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {formatINR(profitAndLoss.totalRevenue)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {profitAndLoss.revenueItems?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                          No revenue recorded in this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      profitAndLoss.revenueItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">
                            <span className="font-mono text-muted-foreground mr-2">[{item.code}]</span>
                            <span className="font-medium text-foreground">{item.name}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {formatINR(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="bg-muted/40 font-bold border-t">
                      <TableCell className="text-xs">Total Operating Revenue</TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                        {formatINR(profitAndLoss.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right: Direct Shoot Expenses (COGS) & Gross Profit */}
            <div className="space-y-6">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                      <Receipt className="h-4 w-4" />
                      Direct Shoot & Production Costs (COGS)
                    </CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs font-bold">
                      {formatINR(profitAndLoss.totalDirectExpenses)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {profitAndLoss.directExpenseItems?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                            No direct shoot expenses recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        profitAndLoss.directExpenseItems?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">
                              <span className="font-mono text-muted-foreground mr-2">[{item.code}]</span>
                              <span className="font-medium text-foreground">{item.name}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {formatINR(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow className="bg-muted/40 font-bold border-t">
                        <TableCell className="text-xs">Total Direct Costs</TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                          {formatINR(profitAndLoss.totalDirectExpenses)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Gross Margin Highlight */}
              <div className="p-4 rounded-xl border bg-gradient-to-r from-emerald-500/10 to-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">Gross Profit</span>
                  <div className="text-xl font-extrabold text-foreground">
                    {formatINR(profitAndLoss.grossProfit)}
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-sm px-2.5 py-1">
                  {profitAndLoss.grossMarginPercent.toFixed(1)}% Margin
                </Badge>
              </div>
            </div>
          </div>

          {/* Indirect Overheads & Final Net Profit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Building2 className="h-4 w-4" />
                    Studio Overheads & Operating Expenses
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {formatINR(profitAndLoss.totalOperatingExpenses)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {profitAndLoss.operatingExpenseItems?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                          No overhead expenses recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      profitAndLoss.operatingExpenseItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">
                            <span className="font-mono text-muted-foreground mr-2">[{item.code}]</span>
                            <span className="font-medium text-foreground">{item.name}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {formatINR(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="bg-muted/40 font-bold border-t">
                      <TableCell className="text-xs">Total Operating Overheads</TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        {formatINR(profitAndLoss.totalOperatingExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Final Net Profit Card */}
            <Card
              className={`border-2 shadow-sm ${
                profitAndLoss.netProfit >= 0
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-rose-500/30 bg-rose-500/5'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase">
                  Net Profit / (Loss) for the Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={`text-3xl font-extrabold ${
                    profitAndLoss.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatINR(profitAndLoss.netProfit)}
                </div>

                <div className="space-y-1 text-xs border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-mono font-semibold">{formatINR(profitAndLoss.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Less: Total Expenses:</span>
                    <span className="font-mono font-semibold text-rose-600">
                      -{formatINR(profitAndLoss.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Net Margin:</span>
                    <span className="font-mono">{profitAndLoss.netMarginPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: BALANCE SHEET */}
        <TabsContent value="bs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Balance Sheet Statement</h3>
              <p className="text-xs text-muted-foreground">
                As of {formatDate(balanceSheet.asOfDate, 'dd MMMM yyyy')}. Fundamental Equation: Assets = Liabilities + Equity.
              </p>
            </div>

            {balanceSheet.isBalanced ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Accounting Equation Balanced</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 text-xs"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Variance Detected ({formatINR(balanceSheet.difference)})</span>
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* COLUMN 1: ASSETS */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <Landmark className="h-4 w-4" />
                    ASSETS
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {formatINR(balanceSheet.totalAssets)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {/* Current Assets */}
                    <TableRow className="bg-muted/30 font-bold text-xs">
                      <TableCell colSpan={2}>Current Assets</TableCell>
                    </TableRow>
                    {balanceSheet.currentAssets?.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs pl-6">
                          <span className="font-mono text-muted-foreground mr-2">[{a.code}]</span>
                          <span>{a.name}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatINR(a.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/10 font-medium text-xs">
                      <TableCell className="pl-6">Subtotal Current Assets</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {formatINR(balanceSheet.totalCurrentAssets)}
                      </TableCell>
                    </TableRow>

                    {/* Fixed Assets */}
                    <TableRow className="bg-muted/30 font-bold text-xs">
                      <TableCell colSpan={2}>Fixed Production & Gear Assets</TableCell>
                    </TableRow>
                    {balanceSheet.fixedAssets?.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs pl-6">
                          <span className="font-mono text-muted-foreground mr-2">[{a.code}]</span>
                          <span>{a.name}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatINR(a.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/10 font-medium text-xs">
                      <TableCell className="pl-6">Subtotal Fixed Assets</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {formatINR(balanceSheet.totalFixedAssets)}
                      </TableCell>
                    </TableRow>

                    {/* Grand Total Assets */}
                    <TableRow className="bg-muted/50 font-extrabold text-sm border-t-2">
                      <TableCell>TOTAL ASSETS</TableCell>
                      <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400">
                        {formatINR(balanceSheet.totalAssets)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* COLUMN 2: LIABILITIES & EQUITY */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Scale className="h-4 w-4" />
                    LIABILITIES & OWNER EQUITY
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {formatINR(balanceSheet.totalLiabilitiesAndEquity)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {/* Liabilities */}
                    <TableRow className="bg-muted/30 font-bold text-xs">
                      <TableCell colSpan={2}>Current Liabilities</TableCell>
                    </TableRow>
                    {balanceSheet.currentLiabilities?.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs pl-6">
                          <span className="font-mono text-muted-foreground mr-2">[{l.code}]</span>
                          <span>{l.name}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatINR(l.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/10 font-medium text-xs">
                      <TableCell className="pl-6">Total Current Liabilities</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {formatINR(balanceSheet.totalLiabilities)}
                      </TableCell>
                    </TableRow>

                    {/* Owner Equity */}
                    <TableRow className="bg-muted/30 font-bold text-xs">
                      <TableCell colSpan={2}>Owner Equity & Retained Earnings</TableCell>
                    </TableRow>
                    {balanceSheet.equityItems?.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs pl-6">
                          <span className="font-mono text-muted-foreground mr-2">[{e.code}]</span>
                          <span>{e.name}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatINR(e.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="text-xs pl-6 flex items-center gap-1 font-semibold text-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span>Retained Earnings / Net Profit to Date</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(balanceSheet.netRetainedProfit)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/10 font-medium text-xs">
                      <TableCell className="pl-6">Total Owner Equity</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {formatINR(balanceSheet.totalEquity)}
                      </TableCell>
                    </TableRow>

                    {/* Grand Total Liabilities & Equity */}
                    <TableRow className="bg-muted/50 font-extrabold text-sm border-t-2">
                      <TableCell>TOTAL LIABILITIES & EQUITY</TableCell>
                      <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                        {formatINR(balanceSheet.totalLiabilitiesAndEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
