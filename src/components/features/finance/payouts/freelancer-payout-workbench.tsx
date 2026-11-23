'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  Banknote,
  Search,
  Building,
  Wallet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  QrCode,
  Calendar,
  User,
  ArrowUpRight,
  Receipt,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { TdsSection, AccountType } from '@prisma/client';
import {
  PendingPayoutItem,
  disburseFreelancerPayoutAction,
  getPendingFreelancerPayoutsAction,
} from '@/actions/payout.actions';

interface FreelancerPayoutWorkbenchProps {
  initialPendingPayouts: PendingPayoutItem[];
  initialSourceAccounts: Array<{ id: string; name: string; code: string | null; type: AccountType }>;
  isTdsEnabled: boolean;
}

export function FreelancerPayoutWorkbench({
  initialPendingPayouts,
  initialSourceAccounts,
  isTdsEnabled,
}: FreelancerPayoutWorkbenchProps) {
  const [payouts, setPayouts] = useState<PendingPayoutItem[]>(initialPendingPayouts);
  const [sourceAccounts, setSourceAccounts] = useState(initialSourceAccounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isRefreshing, startTransition] = useTransition();

  // Disbursement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PendingPayoutItem | null>(null);
  const [selectedTdsSection, setSelectedTdsSection] = useState<TdsSection>(TdsSection.NONE);
  const [paymentMode, setPaymentMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // INR Formatter
  const formatINR = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Distinct roles for filter
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    payouts.forEach((p) => {
      if (p.role) set.add(p.role);
    });
    return Array.from(set);
  }, [payouts]);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        p.user.name.toLowerCase().includes(q) ||
        (p.user.email && p.user.email.toLowerCase().includes(q)) ||
        (p.user.phone && p.user.phone.toLowerCase().includes(q)) ||
        p.role.toLowerCase().includes(q) ||
        p.bookingTitle.toLowerCase().includes(q) ||
        p.bookingNumber.toLowerCase().includes(q)
      );
    });
  }, [payouts, roleFilter, searchQuery]);

  // Total gross amount pending
  const totalPendingGross = useMemo(() => {
    return payouts.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
  }, [payouts]);

  // Refresh data
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await getPendingFreelancerPayoutsAction();
        if (res.success && res.data) {
          setPayouts(res.data.pendingPayouts);
          setSourceAccounts(res.data.sourceAccounts);
          toast.success('Payout queue refreshed');
        } else {
          toast.error(res.error || 'Failed to refresh payouts');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error refreshing payouts');
      }
    });
  };

  // Open Disbursement Modal
  const handleOpenDisburse = (payout: PendingPayoutItem) => {
    setSelectedPayout(payout);
    setSelectedTdsSection(isTdsEnabled ? TdsSection.SEC_194J_PROFESSIONAL : TdsSection.NONE);
    setPaymentMode('BANK');
    setReferenceNumber('');

    // Pre-select primary bank account if available, else first source account
    const defaultBank =
      sourceAccounts.find((a) => a.code === '1030' || a.name.toLowerCase().includes('bank')) ||
      sourceAccounts[0];
    setSelectedAccountId(defaultBank?.id || '');

    setIsModalOpen(true);
  };

  // Change payment mode and smart-select corresponding ledger account
  const handleModeChange = (mode: 'BANK' | 'CASH' | 'UPI') => {
    setPaymentMode(mode);
    if (mode === 'CASH') {
      const cashAcc =
        sourceAccounts.find((a) => a.code === '1010' || a.name.toLowerCase().includes('cash')) ||
        sourceAccounts[0];
      if (cashAcc) setSelectedAccountId(cashAcc.id);
      if (!referenceNumber) setReferenceNumber('Cash disbursement at studio counter');
    } else {
      const bankAcc =
        sourceAccounts.find((a) => a.code === '1030' || a.name.toLowerCase().includes('bank')) ||
        sourceAccounts[0];
      if (bankAcc) setSelectedAccountId(bankAcc.id);
      if (referenceNumber === 'Cash disbursement at studio counter') setReferenceNumber('');
    }
  };

  // Real-time TDS & Net Amount Calculation
  const calculation = useMemo(() => {
    if (!selectedPayout) {
      return { gross: 0, tdsRate: 0, tdsAmount: 0, netPayable: 0, isMissingPan: false };
    }

    const gross = selectedPayout.grossAmount;
    const hasPan = Boolean(
      selectedPayout.user.panNumber && selectedPayout.user.panNumber.trim().length === 10
    );

    if (!isTdsEnabled || selectedTdsSection === TdsSection.NONE) {
      return { gross, tdsRate: 0, tdsAmount: 0, netPayable: gross, isMissingPan: !hasPan };
    }

    let rate = 0;
    if (!hasPan) {
      // Section 206AA penalty rate
      rate = 20.0;
    } else {
      switch (selectedTdsSection) {
        case TdsSection.SEC_194J_PROFESSIONAL:
          rate = 10.0;
          break;
        case TdsSection.SEC_194J_TECHNICAL:
          rate = 2.0;
          break;
        case TdsSection.SEC_194C_CONTRACTOR:
          rate = 1.0;
          break;
        default:
          rate = 0;
      }
    }

    const tds = Math.round(gross * (rate / 100) * 100) / 100;
    const net = Math.round((gross - tds) * 100) / 100;

    return {
      gross,
      tdsRate: rate,
      tdsAmount: tds,
      netPayable: net,
      isMissingPan: !hasPan,
    };
  }, [selectedPayout, selectedTdsSection, isTdsEnabled]);

  // Execute disbursement
  const handleSubmitDisbursement = async () => {
    if (!selectedPayout) return;
    if (!selectedAccountId) {
      toast.error('Please select a source ledger account.');
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error('Reference number or disbursement note is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await disburseFreelancerPayoutAction({
        assignmentId: selectedPayout.id,
        assignmentType: selectedPayout.assignmentType,
        tdsSection: selectedTdsSection,
        paymentMethod: paymentMode,
        sourceAccountId: selectedAccountId,
        referenceNumber: referenceNumber.trim(),
      });

      if (res.success) {
        toast.success(res.message || 'Payout disbursed successfully!');
        setIsModalOpen(false);
        // Refresh local list
        setPayouts((prev) => prev.filter((p) => p.id !== selectedPayout.id));
      } else {
        toast.error(res.error || 'Failed to disburse payout.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error during disbursement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Pending Disbursements</span>
              <Banknote className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground font-mono">
              {payouts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Freelancers awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Gross Liability</span>
              <Building className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatINR(totalPendingGross)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accrued in Ledger #2020
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>TDS Withholding Status</span>
              {isTdsEnabled ? (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-2">
              <Badge
                variant={isTdsEnabled ? 'default' : 'secondary'}
                className={isTdsEnabled ? 'bg-emerald-600 text-white text-xs' : 'text-xs'}
              >
                {isTdsEnabled ? 'TDS Enabled (Sec 194J/194C)' : 'TDS Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {isTdsEnabled
                ? 'Statutory withholding active for studio'
                : 'Sub-threshold exempt or unregistered'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by crew name, role, booking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || 'ALL')}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {distinctRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Payouts Table */}
      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Freelancer</TableHead>
              <TableHead className="w-40">Role & Scope</TableHead>
              <TableHead>Booking Assignment</TableHead>
              <TableHead className="w-48">Banking / UPI Info</TableHead>
              <TableHead className="text-right w-32">Gross Payable</TableHead>
              <TableHead className="text-right w-36">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
                    <p className="text-sm font-medium">No pending freelancer payouts</p>
                    <p className="text-xs text-muted-foreground">
                      All crew assignments have been cleared or verified.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayouts.map((payout) => {
                const hasPan = Boolean(
                  payout.user.panNumber && payout.user.panNumber.trim().length === 10
                );

                return (
                  <TableRow key={`${payout.assignmentType}-${payout.id}`} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <span>{payout.user.name}</span>
                          {hasPan ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1 py-0 h-4 font-mono font-normal"
                              title={`Verified PAN: ${payout.user.panNumber}`}
                            >
                              PAN: {payout.user.panNumber}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 px-1 py-0 h-4 font-normal"
                              title="No PAN on file (Sec 206AA 20% withholding applies if TDS enabled)"
                            >
                              No PAN
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {payout.user.phone || payout.user.email || 'No contact provided'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          {payout.role}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {payout.assignmentType === 'STAFF' ? 'Sub-Event Crew' : 'Event Booking'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 max-w-sm">
                        <div className="text-xs font-medium text-foreground truncate">
                          {payout.bookingTitle}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">#{payout.bookingNumber}</span>
                          {payout.eventDate && (
                            <>
                              <span>•</span>
                              <span>{formatDate(payout.eventDate, 'dd MMM yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {payout.user.bankAccountNumber ? (
                          <div className="font-mono text-[11px] text-foreground">
                            A/C: ••••{payout.user.bankAccountNumber.slice(-4)}
                            <div className="text-[10px] text-muted-foreground">
                              {payout.user.bankIfsc || 'IFSC N/A'}
                            </div>
                          </div>
                        ) : payout.user.upiId ? (
                          <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                            UPI: {payout.user.upiId}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Cash / Counter
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="font-mono font-bold text-sm text-foreground">
                        {formatINR(payout.grossAmount)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDisburse(payout)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Disburse
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DISBURSEMENT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-primary">
                PAYOUT DISBURSEMENT
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedPayout?.role}
              </Badge>
            </div>
            <DialogTitle className="text-lg">
              Disburse Payout to {selectedPayout?.user.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assignment: {selectedPayout?.bookingTitle} (#{selectedPayout?.bookingNumber})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Calculation & TDS Breakdown Card */}
            <div className="p-3.5 rounded-lg border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Agreed Gross Amount:</span>
                <span className="font-mono font-bold text-sm text-foreground">
                  {formatINR(calculation.gross)}
                </span>
              </div>

              {isTdsEnabled ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tdsSection" className="text-xs font-semibold flex items-center gap-1">
                      <span>TDS Section Withholding</span>
                      <Percent className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <Select
                      value={selectedTdsSection}
                      onValueChange={(val) => {
                        if (val) setSelectedTdsSection(val as TdsSection);
                      }}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TdsSection.NONE}>None (0% Withholding)</SelectItem>
                        <SelectItem value={TdsSection.SEC_194J_PROFESSIONAL}>
                          Sec 194J Professional (10%)
                        </SelectItem>
                        <SelectItem value={TdsSection.SEC_194J_TECHNICAL}>
                          Sec 194J Technical (2%)
                        </SelectItem>
                        <SelectItem value={TdsSection.SEC_194C_CONTRACTOR}>
                          Sec 194C Contractor (1%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {calculation.isMissingPan && selectedTdsSection !== TdsSection.NONE && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Section 206AA Notice:</strong> No verified PAN found on profile. Statutory rate of 20% has been applied.
                      </span>
                    </div>
                  )}

                  {calculation.tdsAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                      <span>TDS Deducted ({calculation.tdsRate}%):</span>
                      <span className="font-mono font-semibold">
                        -{formatINR(calculation.tdsAmount)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                  TDS Withholding is disabled in studio tenant settings. Full gross amount will be disbursed.
                </div>
              )}

              {/* Net Amount Banner */}
              <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                    Net Cash Outflow:
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    Actual disbursement to freelancer
                  </div>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {formatINR(calculation.netPayable)}
                </div>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Disbursement Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentMode === 'BANK' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModeChange('BANK')}
                  className="text-xs h-8 gap-1.5"
                >
                  <Building className="h-3.5 w-3.5" />
                  Bank Transfer
                </Button>
                <Button
                  type="button"
                  variant={paymentMode === 'UPI' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModeChange('UPI')}
                  className="text-xs h-8 gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  UPI Payment
                </Button>
                <Button
                  type="button"
                  variant={paymentMode === 'CASH' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModeChange('CASH')}
                  className="text-xs h-8 gap-1.5"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Cash Outflow
                </Button>
              </div>
            </div>

            {/* Source Ledger Account */}
            <div className="space-y-1.5">
              <Label htmlFor="sourceAccount" className="text-xs font-semibold">
                Source Ledger Account (Asset Credit) <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || '')}>
                <SelectTrigger id="sourceAccount" className="text-xs h-9">
                  <SelectValue placeholder="Select paying bank/cash account" />
                </SelectTrigger>
                <SelectContent>
                  {sourceAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.code ? `[${acc.code}] ` : ''}{acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number / UTR / Cash Note */}
            <div className="space-y-1.5">
              <Label htmlFor="referenceNumber" className="text-xs font-semibold">
                {paymentMode === 'CASH'
                  ? 'Disbursement Note / Cash Receipt Signed'
                  : 'Bank UTR / Transaction Reference Number'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="referenceNumber"
                placeholder={
                  paymentMode === 'CASH'
                    ? 'e.g., Handed over cash voucher at studio desk'
                    : 'e.g., HDFC291039401923, UPI/4028192301'
                }
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Recipient Account Snapshot */}
            {paymentMode !== 'CASH' && (
              <div className="p-2.5 rounded border bg-muted/20 text-[11px] space-y-1">
                <span className="text-muted-foreground font-semibold">Recipient Beneficiary Details:</span>
                {selectedPayout?.user.bankAccountNumber ? (
                  <div className="font-mono text-foreground">
                    Bank: {selectedPayout.user.bankName || 'N/A'} • A/C: {selectedPayout.user.bankAccountNumber} • IFSC: {selectedPayout.user.bankIfsc || 'N/A'}
                  </div>
                ) : selectedPayout?.user.upiId ? (
                  <div className="font-mono text-foreground">
                    UPI VPA: {selectedPayout.user.upiId}
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400">
                    ⚠️ No bank details registered on profile. Ensure manual transfer details are checked.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitDisbursement}
              disabled={isSubmitting || !referenceNumber.trim()}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Posting Voucher...' : `Confirm & Disburse ${formatINR(calculation.netPayable)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
