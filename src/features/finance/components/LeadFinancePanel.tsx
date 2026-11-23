'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Calendar,
  Sparkles,
  Loader2,
  FileText,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';
import { formatMoney } from '@/lib/currency';
import {
  recordPaymentAction,
  generateInvoiceFromQuotationAction,
} from '@/actions/finance.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LeadFinancePanelProps {
  leadId: string;
  invoices?: any[];
  quotations?: any[];
  customerName?: string;
  onNavigateToQuotations?: () => void;
}

export function LeadFinancePanel({
  leadId,
  invoices = [],
  quotations = [],
  customerName,
  onNavigateToQuotations,
}: LeadFinancePanelProps) {
  const router = useRouter();
  const [isSubmittingPayment, startPaymentTransition] = useTransition();
  const [isGeneratingInvoice, startGenerateTransition] = useTransition();

  // Active invoice selection (defaults to latest/first invoice)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    invoices[0]?.id || null
  );

  // Dialog State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Resolve active invoice
  const activeInvoice =
    invoices.find((inv) => inv.id === selectedInvoiceId) || invoices[0] || null;

  // Invoice calculations
  const grandTotal = activeInvoice ? Number(activeInvoice.grandTotal || 0) : 0;
  const paidAmount = activeInvoice ? Number(activeInvoice.paidAmount || 0) : 0;
  const balanceDue = activeInvoice
    ? Math.max(0, Number(activeInvoice.balanceDue ?? grandTotal - paidAmount))
    : 0;
  const collectionPercentage =
    grandTotal > 0
      ? Math.min(100, Math.max(0, Math.round((paidAmount / grandTotal) * 100)))
      : 0;

  const payments = activeInvoice?.payments || [];
  const isFullyPaid =
    activeInvoice?.status === InvoiceStatus.PAID || balanceDue <= 0;

  // Open modal with pre-filled default
  const handleOpenRecordPayment = () => {
    setFormError(null);
    setPaymentAmount(balanceDue > 0 ? balanceDue.toString() : '');
    setPaymentMethod(PaymentMethod.UPI);
    setTransactionRef('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setIsRecordPaymentOpen(true);
  };

  // Submit payment handler
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    const numAmount = Number(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please specify a valid payment amount greater than zero.');
      return;
    }

    if (numAmount > balanceDue) {
      setFormError(
        `Payment amount cannot exceed remaining balance of ${formatMoney(balanceDue)}.`
      );
      return;
    }

    setFormError(null);

    startPaymentTransition(async () => {
      try {
        const payload = {
          invoiceId: activeInvoice.id,
          amount: numAmount,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        };

        const res = await recordPaymentAction(payload);
        if (res.success) {
          toast.success(
            `Payment of ${formatMoney(numAmount)} recorded successfully!`
          );
          setIsRecordPaymentOpen(false);
          router.refresh();
        } else {
          setFormError(res.error || 'Failed to record payment');
          toast.error(res.error || 'Failed to record payment');
        }
      } catch (err: any) {
        setFormError(err?.message || 'An unexpected error occurred');
        toast.error(err?.message || 'An unexpected error occurred');
      }
    });
  };

  // Generate invoice from approved quotation
  const handleGenerateInvoice = (quotationId: string) => {
    startGenerateTransition(async () => {
      try {
        const res = await generateInvoiceFromQuotationAction(quotationId);
        if (res.success) {
          toast.success('Invoice generated successfully from approved quotation!');
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to generate invoice');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to generate invoice');
      }
    });
  };

  // Status Badge Helper
  const renderInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid in Full
          </Badge>
        );
      case 'PARTIALLY_PAID':
      case 'PARTIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Partially Paid
          </Badge>
        );
      case 'UNPAID':
      case 'SENT':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
      case 'DRAFT':
        return (
          <Badge variant="outline" className="text-gray-600">
            Draft
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="text-red-500 border-red-200">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Payment Method Badge Helper
  const renderPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'UPI':
        return (
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-mono text-[11px]"
          >
            UPI
          </Badge>
        );
      case 'BANK_TRANSFER':
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 font-mono text-[11px]"
          >
            Bank Transfer
          </Badge>
        );
      case 'CARD':
        return (
          <Badge
            variant="secondary"
            className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 font-mono text-[11px]"
          >
            Card
          </Badge>
        );
      case 'CASH':
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 font-mono text-[11px]"
          >
            Cash
          </Badge>
        );
      case 'CHEQUE':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 font-mono text-[11px]"
          >
            Cheque
          </Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // EMPTY STATE
  if (!activeInvoice) {
    const approvedQuotation = quotations?.find(
      (q: any) => q.status === 'ACCEPTED' || q.status === 'APPROVED'
    );

    return (
      <Card className="border-dashed shadow-xs">
        <CardContent className="py-14 px-6 text-center space-y-4 max-w-lg mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-lg text-foreground">
              No active invoice for this lead
            </h3>
            <p className="text-sm text-muted-foreground">
              No active invoice for this lead. Await quotation approval.
            </p>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-3.5 rounded-lg border text-left leading-relaxed">
            Invoices are auto-generated when a client accepts a commercial quotation.
            Once generated, you can track advance receipts, manage payment schedules,
            and monitor outstanding dues right here.
          </p>
          {approvedQuotation && (
            <div className="pt-2">
              <Button
                onClick={() => handleGenerateInvoice(approvedQuotation.id)}
                disabled={isGeneratingInvoice}
                className="gap-2 shadow-xs"
              >
                {isGeneratingInvoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Invoice for Approved Quotation (
                {formatMoney(approvedQuotation.totalAmount)})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Multiple Invoices Switcher */}
      {invoices.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Invoices ({invoices.length}):
          </span>
          {invoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => setSelectedInvoiceId(inv.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                inv.id === activeInvoice.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              <span className="font-mono">{inv.invoiceNumber}</span>
              <span className="text-[10px] opacity-80" suppressHydrationWarning>
                ({formatMoney(Number(inv.grandTotal))})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Invoice Overview Bar */}
      <div className="bg-card p-5 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2 text-foreground">
              <Receipt className="w-5 h-5 text-primary" />
              {activeInvoice.invoiceNumber}
            </h2>
            {renderInvoiceStatusBadge(activeInvoice.status)}
          </div>
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            <span>
              Issued:{' '}
              <strong className="text-foreground font-medium">
                {activeInvoice.issueDate
                  ? format(new Date(activeInvoice.issueDate), 'PP')
                  : 'N/A'}
              </strong>
            </span>
            <span>•</span>
            <span>
              Due:{' '}
              <strong className="text-foreground font-medium">
                {activeInvoice.dueDate
                  ? format(new Date(activeInvoice.dueDate), 'PP')
                  : 'Upon Receipt'}
              </strong>
            </span>
            {activeInvoice.quotation && (
              <>
                <span>•</span>
                <span>
                  Quote Ref:{' '}
                  <strong className="font-mono text-foreground">
                    {activeInvoice.quotation.quotationCode ||
                      activeInvoice.quotation.id?.slice(0, 8)}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenRecordPayment}
            disabled={isFullyPaid}
            className="gap-2 font-semibold shadow-xs"
          >
            <CreditCard className="w-4 h-4" />
            {isFullyPaid ? 'Invoice Settled' : 'Record Payment'}
          </Button>
        </div>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Grand Total */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Grand Total</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-foreground font-mono"
              suppressHydrationWarning
            >
              {formatMoney(grandTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
              Subtotal: {formatMoney(Number(activeInvoice.subtotal || 0))}
              {Number(activeInvoice.taxAmount) > 0
                ? ` | Tax: +${formatMoney(Number(activeInvoice.taxAmount))}`
                : ''}
            </p>
          </CardContent>
        </Card>

        {/* Paid Amount */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Paid Amount</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono"
              suppressHydrationWarning
            >
              {formatMoney(paidAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {collectionPercentage}% collected across {payments.length} receipt
              {payments.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Balance Due</span>
              <AlertCircle
                className={`w-4 h-4 ${
                  balanceDue > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                balanceDue > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
              suppressHydrationWarning
            >
              {formatMoney(balanceDue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceDue <= 0
                ? 'All dues cleared'
                : 'Remaining balance receivable'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress Bar */}
      <div className="bg-card p-4 rounded-xl border shadow-xs space-y-2">
        <div className="flex justify-between items-center text-xs font-medium">
          <span className="text-muted-foreground">Collection Status</span>
          <span className="font-mono font-semibold" suppressHydrationWarning>
            {formatMoney(paidAmount)} of {formatMoney(grandTotal)} (
            {collectionPercentage}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${collectionPercentage}%` }}
          />
        </div>
      </div>

      {/* Payment Receipts History Table */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payment History & Receipts
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Chronological log of payments and advances credited to this invoice
            </CardDescription>
          </div>
          {!isFullyPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenRecordPayment}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">No payments recorded yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Click &quot;Record Payment&quot; above to log an advance payment,
                deposit, or installment from the client.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-xs">Receipt No</TableHead>
                    <TableHead className="font-semibold text-xs">Date</TableHead>
                    <TableHead className="font-semibold text-xs">Method</TableHead>
                    <TableHead className="font-semibold text-xs">Reference</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {p.receiptNumber}
                      </TableCell>
                      <TableCell
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {p.paymentDate
                          ? format(new Date(p.paymentDate), 'dd MMM yyyy, p')
                          : '—'}
                      </TableCell>
                      <TableCell>{renderPaymentMethodBadge(p.paymentMethod)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[180px] truncate">
                        {p.transactionRef || p.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.status === 'SUCCESS' ? 'default' : 'outline'}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400"
                        suppressHydrationWarning
                      >
                        +{formatMoney(Number(p.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Record an advance payment or installment received for Invoice{' '}
              <strong className="font-mono text-foreground">
                {activeInvoice.invoiceNumber}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          {/* Invoice Summary Header in Modal */}
          <div className="bg-muted/60 p-3.5 rounded-lg border grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">Invoice Total</span>
              <span
                className="font-bold text-sm font-mono text-foreground"
                suppressHydrationWarning
              >
                {formatMoney(grandTotal)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Remaining Balance</span>
              <span
                className="font-bold text-sm font-mono text-rose-600 dark:text-rose-400"
                suppressHydrationWarning
              >
                {formatMoney(balanceDue)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4 pt-1">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="paymentAmount">Amount (₹) *</Label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(balanceDue.toString())}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Full Balance ({formatMoney(balanceDue)})
                  </button>
                  {balanceDue > 1000 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(Math.round(balanceDue * 0.5).toString())
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      50%
                    </button>
                  )}
                </div>
              </div>
              <Input
                id="paymentAmount"
                type="number"
                min="1"
                max={balanceDue}
                step="0.01"
                placeholder={`Enter amount up to ₹${balanceDue}`}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setFormError(null);
                }}
                required
                className="font-mono text-base font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Maximum payable: {formatMoney(balanceDue)}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">
                    UPI (Google Pay / PhonePe / Paytm / QR)
                  </SelectItem>
                  <SelectItem value="BANK_TRANSFER">
                    Bank Transfer (NEFT / RTGS / IMPS)
                  </SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque / Demand Draft</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label htmlFor="transactionRef">Transaction Reference / UTR</Label>
              <Input
                id="transactionRef"
                type="text"
                placeholder="e.g., UPI-94820392 or UTR12345678 or Cash Memo #12"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="font-mono"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes / Remarks</Label>
              <Input
                id="paymentNotes"
                type="text"
                placeholder="e.g., Advance payment to lock wedding dates"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRecordPaymentOpen(false)}
                disabled={isSubmittingPayment}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmittingPayment ||
                  !paymentAmount ||
                  Number(paymentAmount) <= 0 ||
                  Number(paymentAmount) > balanceDue
                }
                className="gap-2"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
