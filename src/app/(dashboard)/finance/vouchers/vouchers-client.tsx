'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  Calendar,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  ArrowRightLeft,
  BookOpen,
  Info,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  createVoucherAction,
  getVouchersAction,
  voidFinancialVoucherAction,
} from '@/actions/accounting.actions';
import { VoucherType, EntryType, AccountType } from '@prisma/client';

interface VoucherEntryState {
  accountId: string;
  type: EntryType;
  amount: string;
}

interface VouchersClientProps {
  initialVouchers: any[];
  initialSummary: {
    totalCount: number;
    totalPayments: number;
    totalReceipts: number;
    totalContra: number;
    totalJournals: number;
  };
  accounts: any[];
}

const VOUCHER_TYPE_CONFIG: Record<
  VoucherType,
  {
    label: string;
    code: string;
    description: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  [VoucherType.PAYMENT]: {
    label: 'Payment Voucher',
    code: 'PAY',
    description: 'Outflow of cash/bank funds for expenses, crew retainers, or vendor settlements',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  [VoucherType.RECEIPT]: {
    label: 'Receipt Voucher',
    code: 'REC',
    description: 'Inflow of client advance bookings, final settlements, or other operating revenue',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  [VoucherType.CONTRA]: {
    label: 'Contra Voucher',
    code: 'CON',
    description: 'Internal fund transfers between bank accounts or cash-to-bank deposits/withdrawals',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  [VoucherType.JOURNAL]: {
    label: 'Journal Voucher',
    code: 'JRN',
    description: 'Non-cash accounting adjustments, depreciation, accruals, and inter-ledger transfers',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
};

export function VouchersClient({
  initialVouchers = [],
  initialSummary,
  accounts = [],
}: VouchersClientProps) {
  const [vouchers, setVouchers] = useState<any[]>(initialVouchers);
  const [summary, setSummary] = useState(initialSummary);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Create Voucher Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.PAYMENT);
  const [voucherDate, setVoucherDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [narration, setNarration] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Voucher Entries (starts with 2 rows)
  const [entries, setEntries] = useState<VoucherEntryState[]>([
    { accountId: '', type: EntryType.DEBIT, amount: '' },
    { accountId: '', type: EntryType.CREDIT, amount: '' },
  ]);

  // View Voucher Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  // Void Voucher Modal State
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Currency formatter in INR
  const formatINR = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Real-time Double-Entry Totals Calculation
  const { totalDebits, totalCredits, difference, isBalanced, canSubmit } = useMemo(() => {
    let debits = 0;
    let credits = 0;
    let validEntriesCount = 0;

    for (const e of entries) {
      const amt = Number(e.amount);
      if (!isNaN(amt) && amt > 0 && e.accountId) {
        validEntriesCount++;
        const cents = Math.round(amt * 100);
        if (e.type === EntryType.DEBIT) {
          debits += cents;
        } else if (e.type === EntryType.CREDIT) {
          credits += cents;
        }
      }
    }

    const diffCents = Math.abs(debits - credits);
    const balanced = debits > 0 && diffCents === 0;
    const submitReady = balanced && validEntriesCount >= 2;

    return {
      totalDebits: debits / 100,
      totalCredits: credits / 100,
      difference: diffCents / 100,
      isBalanced: balanced,
      canSubmit: submitReady,
    };
  }, [entries]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesType = activeTab === 'ALL' || v.type === activeTab;
      if (!matchesType) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const numMatch = v.voucherNumber?.toLowerCase().includes(q);
      const narrMatch = v.narration?.toLowerCase().includes(q);
      const refMatch = v.referenceId?.toLowerCase().includes(q);
      const accountMatch = v.entries?.some((e: any) =>
        e.account?.name?.toLowerCase().includes(q)
      );

      return numMatch || narrMatch || refMatch || accountMatch;
    });
  }, [vouchers, activeTab, searchQuery]);

  // Add line entry row
  const handleAddRow = () => {
    // Alternate default type based on current balance
    const nextType =
      totalDebits > totalCredits ? EntryType.CREDIT : EntryType.DEBIT;
    const diffAmt = difference > 0 ? difference.toString() : '';

    setEntries((prev) => [
      ...prev,
      { accountId: '', type: nextType, amount: diffAmt },
    ]);
  };

  // Remove line entry row
  const handleRemoveRow = (index: number) => {
    if (entries.length <= 2) {
      toast.error('A double-entry voucher must contain at least two entries.');
      return;
    }
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update entry row field
  const handleUpdateRow = (
    index: number,
    field: keyof VoucherEntryState,
    value: any
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Open Create Voucher Modal with Preset Setup
  const handleOpenCreateModal = (type: VoucherType = VoucherType.PAYMENT) => {
    setVoucherType(type);
    setVoucherDate(new Date().toISOString().split('T')[0]);
    setNarration('');
    setReferenceId('');

    // Pre-populate intelligent account defaults based on voucher type
    const cashAcc = accounts.find((a) => a.name.toLowerCase().includes('cash'));
    const bankAcc = accounts.find((a) => a.name.toLowerCase().includes('bank'));
    const expAcc = accounts.find((a) => a.type === AccountType.EXPENSE);
    const revAcc = accounts.find((a) => a.type === AccountType.REVENUE);

    if (type === VoucherType.PAYMENT) {
      // Payment: Dr Expense / Cr Bank
      setEntries([
        { accountId: expAcc ? expAcc.id : '', type: EntryType.DEBIT, amount: '' },
        { accountId: bankAcc ? bankAcc.id : (cashAcc ? cashAcc.id : ''), type: EntryType.CREDIT, amount: '' },
      ]);
    } else if (type === VoucherType.RECEIPT) {
      // Receipt: Dr Bank / Cr Revenue
      setEntries([
        { accountId: bankAcc ? bankAcc.id : (cashAcc ? cashAcc.id : ''), type: EntryType.DEBIT, amount: '' },
        { accountId: revAcc ? revAcc.id : '', type: EntryType.CREDIT, amount: '' },
      ]);
    } else if (type === VoucherType.CONTRA) {
      // Contra: Dr Bank / Cr Cash (or vice versa)
      setEntries([
        { accountId: bankAcc ? bankAcc.id : '', type: EntryType.DEBIT, amount: '' },
        { accountId: cashAcc ? cashAcc.id : '', type: EntryType.CREDIT, amount: '' },
      ]);
    } else {
      // Journal
      setEntries([
        { accountId: '', type: EntryType.DEBIT, amount: '' },
        { accountId: '', type: EntryType.CREDIT, amount: '' },
      ]);
    }

    setCreateModalOpen(true);
  };

  // Submit Voucher
  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast.error(
        `Cannot save voucher: Debits and Credits must be equal. Out of balance by ${formatINR(difference)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createVoucherAction({
        type: voucherType,
        date: voucherDate,
        narration,
        referenceId,
        entries: entries.map((e) => ({
          accountId: e.accountId,
          type: e.type,
          amount: Number(e.amount),
        })),
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to create financial voucher');
        return;
      }

      toast.success(`Voucher ${res.data.voucherNumber} posted successfully!`);
      setCreateModalOpen(false);

      // Refresh list
      const refreshed = await getVouchersAction();
      if (refreshed.success && refreshed.data) {
        setVouchers(refreshed.data.vouchers);
        setSummary(refreshed.data.summary);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while creating voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailsModal = (voucher: any) => {
    setSelectedVoucher(voucher);
    setDetailsModalOpen(true);
  };

  // Void Voucher Handler
  const handleVoidVoucher = async () => {
    if (!selectedVoucher || !voidReason.trim()) {
      toast.error('Please enter a valid reason to void this voucher.');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidFinancialVoucherAction(selectedVoucher.id, voidReason);
      if (res.success) {
        toast.success(res.message);
        setVoidModalOpen(false);
        setDetailsModalOpen(false);
        setVoidReason('');
        // Refresh list
        const refreshed = await getVouchersAction();
        if (refreshed.success && refreshed.data) {
          setVouchers(refreshed.data.vouchers);
          setSummary(refreshed.data.summary);
        }
      } else {
        toast.error(res.error || 'Failed to void voucher');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while voiding voucher');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Financial Daybook & Vouchers</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Double-Entry Engine
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Record payments, receipts, cash-bank contras, and journal vouchers with real-time debit/credit balancing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => handleOpenCreateModal(VoucherType.PAYMENT)}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            New Payment
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreateModal(VoucherType.RECEIPT)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowDownRight className="h-4 w-4 mr-1" />
            New Receipt
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenCreateModal(VoucherType.JOURNAL)}
            className="text-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            Other Voucher
          </Button>
        </div>
      </div>

      {/* Financial Summary Metric Strip */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase flex items-center justify-between">
              <span>Total Payments Out</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">
              {formatINR(summary.totalPayments)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Crew fees, rentals & expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase flex items-center justify-between">
              <span>Total Receipts In</span>
              <ArrowDownRight className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">
              {formatINR(summary.totalReceipts)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Client advances & shoot receipts
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center justify-between">
              <span>Contra Transfers</span>
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">
              {formatINR(summary.totalContra)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Cash & bank reconciliations
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase flex items-center justify-between">
              <span>Journal Adjustments</span>
              <Scale className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">
              {formatINR(summary.totalJournals)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Accruals & non-cash entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Tab Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search voucher #, narration, reference or ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredVouchers.length} of {summary.totalCount} posted vouchers
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
            <TabsTrigger value="ALL" className="text-xs">
              All Daybook ({summary.totalCount})
            </TabsTrigger>
            <TabsTrigger value={VoucherType.PAYMENT} className="text-xs">
              Payments
            </TabsTrigger>
            <TabsTrigger value={VoucherType.RECEIPT} className="text-xs">
              Receipts
            </TabsTrigger>
            <TabsTrigger value={VoucherType.CONTRA} className="text-xs">
              Contra
            </TabsTrigger>
            <TabsTrigger value={VoucherType.JOURNAL} className="text-xs">
              Journal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vouchers Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-32">Voucher No</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead>Ledger Accounts Involved</TableHead>
              <TableHead>Narration / Reference</TableHead>
              <TableHead className="text-right w-36">Total Amount</TableHead>
              <TableHead className="w-20 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No vouchers found for the selected filter. Click &quot;New Payment&quot; or &quot;New Receipt&quot; to post a transaction.
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((voucher) => {
                const typeCfg =
                  VOUCHER_TYPE_CONFIG[voucher.type as VoucherType] ||
                  VOUCHER_TYPE_CONFIG[VoucherType.JOURNAL];

                const debitEntries = voucher.entries.filter(
                  (e: any) => e.type === EntryType.DEBIT
                );
                const creditEntries = voucher.entries.filter(
                  (e: any) => e.type === EntryType.CREDIT
                );

                return (
                  <TableRow
                    key={voucher.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      voucher.isVoided ? 'opacity-60 bg-muted/20' : ''
                    }`}
                  >
                    <TableCell className="text-xs font-medium">
                      {formatDate(voucher.date, 'dd MMM yyyy')}
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {voucher.voucherNumber}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}
                        >
                          {typeCfg.label.split(' ')[0]}
                        </Badge>
                        {voucher.isVoided && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 font-bold bg-rose-600/90 text-white"
                          >
                            VOIDED
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="font-semibold text-foreground">Dr:</span>
                          <span className="truncate max-w-xs">
                            {debitEntries.map((e: any) => e.account?.name).join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="font-semibold text-foreground">Cr:</span>
                          <span className="truncate max-w-xs">
                            {creditEntries.map((e: any) => e.account?.name).join(', ')}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-foreground font-medium truncate max-w-md">
                        {voucher.narration || 'No narration provided'}
                      </div>
                      {voucher.referenceId && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Ref: {voucher.referenceId}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                      {formatINR(voucher.totalAmount)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDetailsModal(voucher)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="View Double-Entry Voucher"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL 1: CREATE DOUBLE-ENTRY VOUCHER */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmitVoucher}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>Create Double-Entry Financial Voucher</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${VOUCHER_TYPE_CONFIG[voucherType].bg} ${VOUCHER_TYPE_CONFIG[voucherType].color}`}
                >
                  {VOUCHER_TYPE_CONFIG[voucherType].label}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {VOUCHER_TYPE_CONFIG[voucherType].description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Top Controls: Type, Date, Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="v-type">Voucher Type *</Label>
                  <Select
                    value={voucherType}
                    onValueChange={(val) => {
                      if (val) handleOpenCreateModal(val as VoucherType);
                    }}
                  >
                    <SelectTrigger id="v-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VoucherType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {VOUCHER_TYPE_CONFIG[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-date">Voucher Date *</Label>
                  <Input
                    id="v-date"
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-ref">Reference ID / Bill #</Label>
                  <Input
                    id="v-ref"
                    placeholder="e.g. BKG-2026-004, INV-892"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                  />
                </div>
              </div>

              {/* General Narration */}
              <div className="space-y-1.5">
                <Label htmlFor="v-narr">Narration / Transaction Description</Label>
                <Input
                  id="v-narr"
                  placeholder="e.g. Paid advance shoot fee to lead cinematographer for Sharma destination wedding"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>

              {/* Dynamic Double-Entry Ledger Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    Double-Entry Line Items ({entries.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Entry Row
                  </Button>
                </div>

                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border bg-card/60 text-xs"
                    >
                      {/* Debit / Credit Select */}
                      <div className="w-full sm:w-28 shrink-0">
                        <Select
                          value={entry.type}
                          onValueChange={(val) => {
                            if (val) handleUpdateRow(idx, 'type', val as EntryType);
                          }}
                        >
                          <SelectTrigger className="h-8 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EntryType.DEBIT} className="text-blue-600 font-semibold">
                              Dr (Debit)
                            </SelectItem>
                            <SelectItem value={EntryType.CREDIT} className="text-amber-600 font-semibold">
                              Cr (Credit)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ledger Account Select */}
                      <div className="flex-1 min-w-[200px]">
                        <Select
                          value={entry.accountId}
                          onValueChange={(val) => {
                            if (val) handleUpdateRow(idx, 'accountId', val);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select ledger account..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                <div className="flex items-center justify-between gap-2">
                                  <span>{acc.name}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    [{acc.type}]
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount Input */}
                      <div className="w-full sm:w-36 shrink-0 relative">
                        <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) => handleUpdateRow(idx, 'amount', e.target.value)}
                          className="h-8 pl-6 font-mono text-xs text-right"
                          required
                        />
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={entries.length <= 2}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Double-Entry Balance Calculation Bar */}
              <div className="p-3.5 rounded-lg border bg-muted/30 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Debits</span>
                    <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatINR(totalDebits)}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Total Credits</span>
                    <div className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatINR(totalCredits)}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Imbalance Diff</span>
                    <div
                      className={`font-mono text-sm font-bold ${
                        difference === 0 && totalDebits > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatINR(difference)}
                    </div>
                  </div>
                </div>

                {isBalanced ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Double-Entry Balanced: Total Debits equal Total Credits!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium pt-1 border-t border-rose-500/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Out of balance by {formatINR(difference)}. Add an offsetting line entry to balance.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? 'Posting Voucher...' : 'Save & Post Voucher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: VIEW VOUCHER DETAILS */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-primary">
                {selectedVoucher?.voucherNumber}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs">
                  {selectedVoucher?.type}
                </Badge>
                {selectedVoucher?.isVoided && (
                  <Badge variant="destructive" className="text-xs font-bold bg-rose-600">
                    VOIDED
                  </Badge>
                )}
              </div>
            </div>
            <DialogTitle className="text-lg">Journal Voucher Details</DialogTitle>
            <DialogDescription>
              Posted on {formatDate(selectedVoucher?.date, 'dd MMMM yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {selectedVoucher?.isVoided && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <span>THIS VOUCHER HAS BEEN VOIDED / REVERSED</span>
                </div>
                {selectedVoucher.voidReason && (
                  <p className="text-xs text-foreground mt-1">
                    <span className="font-semibold text-muted-foreground">Reason:</span> {selectedVoucher.voidReason}
                  </p>
                )}
                {selectedVoucher.voidedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    Voided on {formatDate(selectedVoucher.voidedAt, 'dd MMM yyyy, hh:mm a')}
                  </p>
                )}
              </div>
            )}

            {selectedVoucher?.narration && (
              <div className="p-3 rounded-md bg-muted/40 border">
                <span className="text-[11px] text-muted-foreground uppercase font-bold">Narration:</span>
                <p className="text-foreground mt-0.5 text-xs">{selectedVoucher.narration}</p>
              </div>
            )}

            {selectedVoucher?.referenceId && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Reference Link:</span>
                <span className="font-mono font-semibold text-foreground">
                  {selectedVoucher.referenceId}
                </span>
              </div>
            )}

            {/* Voucher Double-Entry Lines */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Account / Ledger</TableHead>
                    <TableHead className="text-right text-xs">Debit (₹)</TableHead>
                    <TableHead className="text-right text-xs">Credit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVoucher?.entries?.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{entry.account?.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {entry.account?.code ? `[${entry.account.code}] ` : ''}{entry.account?.type}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {entry.type === EntryType.DEBIT ? formatINR(Number(entry.amount)) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {entry.type === EntryType.CREDIT ? formatINR(Number(entry.amount)) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(selectedVoucher?.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(selectedVoucher?.totalAmount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {!selectedVoucher?.isVoided && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setVoidModalOpen(true)}
                  className="gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Void Voucher
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedVoucher) {
                    const summaryText = `VOUCHER: ${selectedVoucher.voucherNumber} (${selectedVoucher.type})\nDate: ${formatDate(selectedVoucher.date)}\nTotal: ${formatINR(selectedVoucher.totalAmount)}\nNarration: ${selectedVoucher.narration || 'N/A'}`;
                    navigator.clipboard.writeText(summaryText);
                    toast.success('Voucher summary copied to clipboard!');
                  }
                }}
              >
                Copy Summary
              </Button>
              <Button type="button" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VOID VOUCHER REVERSAL CONFIRMATION */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Void Voucher #{selectedVoucher?.voucherNumber}
            </DialogTitle>
            <DialogDescription>
              Under Indian MCA and accounting compliance rules, vouchers cannot be deleted.
              Voiding this voucher will mark it voided and automatically post an offsetting
              reversal journal voucher to balance the ledgers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="voidReason" className="text-xs font-semibold">
              Mandatory Reason for Voiding <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="voidReason"
              placeholder="e.g., Client requested date rescheduling, duplicate entry, incorrect amount..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidModalOpen(false)}
              disabled={isVoiding}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleVoidVoucher}
              disabled={isVoiding || voidReason.trim().length < 3}
            >
              {isVoiding ? 'Posting Reversal...' : 'Confirm & Post Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
