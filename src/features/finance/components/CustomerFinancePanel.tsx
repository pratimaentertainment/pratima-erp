'use client';

import React, { useState, useMemo, useTransition } from 'react';
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
  FileText,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';
import { formatMoney } from '@/lib/currency';
import { recordPaymentAction } from '@/actions/finance.actions';
import { toast } from 'sonner';
import { CreditNoteModal } from './CreditNoteModal';

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

const CREDIT_NOTE_REASON_NAMES: Record<string, string> = {
  CLIENT_DISCOUNT_ADJUSTMENT: 'Client Discount / Goodwill',
  EVENT_CANCELLED: 'Event Cancelled',
  POST_PRODUCTION_DEFICIENCY: 'Post-Production Deficiency',
  OVERBILLING_CORRECTION: 'Overbilling Correction',
  OTHER: 'Commercial Adjustment',
};

export interface CustomerFinancePanelProps {
  customerId: string;
  customerName?: string;
  invoices?: any[];
  allPayments?: any[];
  creditNotes?: any[];
}

export function CustomerFinancePanel({
  customerId,
  customerName,
  invoices = [],
  allPayments = [],
  creditNotes = [],
}: CustomerFinancePanelProps) {
  const router = useRouter();
  const [isSubmittingPayment, startPaymentTransition] = useTransition();

  // Dialog State for Credit Note
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [creditNoteTargetInvoice, setCreditNoteTargetInvoice] = useState<any | null>(null);

  // Compute aggregated credit notes
  const allCustomerCreditNotes = useMemo(() => {
    if (creditNotes && creditNotes.length > 0) return creditNotes;
    const list: any[] = [];
    invoices.forEach((inv: any) => {
      if (inv.creditNotes && Array.isArray(inv.creditNotes)) {
        list.push(...inv.creditNotes);
      }
    });
    return list;
  }, [creditNotes, invoices]);

  // Active invoice selection (defaults to latest/first invoice)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    invoices[0]?.id || null
  );

  // Dialog State for Record Payment
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Lifetime customer financial metrics across all invoices
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.paidAmount || 0),
    0
  );
  const totalBalanceDue = Math.max(0, totalInvoiced - totalPaid);
  const overallCollectionRate =
    totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  // Resolve currently active invoice for single-invoice view
  const activeInvoice =
    invoices.find((inv) => inv.id === selectedInvoiceId) || invoices[0] || null;

  const invoiceGrandTotal = activeInvoice ? Number(activeInvoice.grandTotal || 0) : 0;
  const invoicePaidAmount = activeInvoice ? Number(activeInvoice.paidAmount || 0) : 0;
  const invoiceBalanceDue = activeInvoice
    ? Math.max(0, Number(activeInvoice.balanceDue ?? invoiceGrandTotal - invoicePaidAmount))
    : 0;
  const invoicePayments = activeInvoice?.payments || [];
  const isInvoiceFullyPaid =
    activeInvoice?.status === InvoiceStatus.PAID || invoiceBalanceDue <= 0;

  // Open modal with pre-filled default
  const handleOpenRecordPayment = (targetInvoiceId?: string) => {
    const inv = targetInvoiceId
      ? invoices.find((i) => i.id === targetInvoiceId) || activeInvoice
      : activeInvoice;

    if (!inv) return;
    setSelectedInvoiceId(inv.id);
    const balance = Math.max(
      0,
      Number(inv.balanceDue ?? Number(inv.grandTotal) - Number(inv.paidAmount || 0))
    );

    setFormError(null);
    setPaymentAmount(balance > 0 ? balance.toString() : '');
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

    if (numAmount > invoiceBalanceDue) {
      setFormError(
        `Payment amount cannot exceed remaining invoice balance of ${formatMoney(
          invoiceBalanceDue
        )}.`
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

  // Status Badge Helper
  const renderInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
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
  if (invoices.length === 0) {
    return (
      <Card className="border-dashed shadow-xs">
        <CardContent className="py-14 px-6 text-center space-y-4 max-w-lg mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-lg text-foreground">
              No Billing Invoices for this Customer
            </h3>
            <p className="text-sm text-muted-foreground">
              No active invoice for this customer. Invoices are automatically generated
              upon quotation approval.
            </p>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-3.5 rounded-lg border text-left leading-relaxed">
            When a commercial quote is accepted by this client, the billing engine
            provisions sequential invoices with automatic balance tracking, tax
            schedules, and advance receipt recording.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lifetime Financial Summary (Customer Level) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Lifetime Invoiced</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-foreground font-mono"
              suppressHydrationWarning
            >
              {formatMoney(totalInvoiced)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {invoices.length} commercial invoice{invoices.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Total Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono"
              suppressHydrationWarning
            >
              {formatMoney(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallCollectionRate}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Outstanding Balance</span>
              <AlertCircle
                className={`w-4 h-4 ${
                  totalBalanceDue > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                totalBalanceDue > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
              suppressHydrationWarning
            >
              {formatMoney(totalBalanceDue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBalanceDue <= 0 ? 'All customer accounts cleared' : 'Total receivables pending'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Switcher if > 1 */}
      {invoices.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Invoice:
          </span>
          {invoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => setSelectedInvoiceId(inv.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                inv.id === activeInvoice?.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              <span className="font-mono">{inv.invoiceNumber}</span>
              <span className="text-[10px] opacity-80" suppressHydrationWarning>
                ({formatMoney(Number(inv.grandTotal))})
              </span>
              {renderInvoiceStatusBadge(inv.status)}
            </button>
          ))}
        </div>
      )}

      {/* Active Invoice Details Bar */}
      {activeInvoice && (
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
                    Quote:{' '}
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
            {activeInvoice.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                onClick={() => {
                  setCreditNoteTargetInvoice(activeInvoice);
                  setIsCreditNoteModalOpen(true);
                }}
                className="gap-2 font-semibold border-rose-500/30 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
              >
                <RotateCcw className="w-4 h-4" />
                Issue Credit Note / Cancel
              </Button>
            )}
            <Button
              onClick={() => handleOpenRecordPayment(activeInvoice.id)}
              disabled={isInvoiceFullyPaid || activeInvoice.status === 'CANCELLED'}
              className="gap-2 font-semibold shadow-xs"
            >
              <CreditCard className="w-4 h-4" />
              {activeInvoice.status === 'CANCELLED'
                ? 'Invoice Cancelled'
                : isInvoiceFullyPaid
                ? 'Invoice Settled'
                : 'Record Payment'}
            </Button>
          </div>
        </div>
      )}

      {/* Active Invoice Collection Progress */}
      {activeInvoice && (
        <div className="bg-card p-4 rounded-xl border shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-muted-foreground">
              Invoice Collection: {activeInvoice.invoiceNumber}
            </span>
            <span className="font-mono font-semibold" suppressHydrationWarning>
              {formatMoney(invoicePaidAmount)} of {formatMoney(invoiceGrandTotal)} (
              {invoiceGrandTotal > 0
                ? Math.round((invoicePaidAmount / invoiceGrandTotal) * 100)
                : 0}
              %)
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${
                  invoiceGrandTotal > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round((invoicePaidAmount / invoiceGrandTotal) * 100)
                        )
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Invoice Line Items (Collapsible / Summary) */}
      {activeInvoice?.items && activeInvoice.items.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Invoice Line Items ({activeInvoice.invoiceNumber})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Item</TableHead>
                    <TableHead className="text-xs font-semibold">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Tax</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeInvoice.items.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground">{item.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-xs text-right font-mono" suppressHydrationWarning>
                        {formatMoney(Number(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground" suppressHydrationWarning>
                        +{formatMoney(Number(item.taxAmount || 0))}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold" suppressHydrationWarning>
                        {formatMoney(Number(item.totalPrice))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Receipts History Table */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payment History & Receipts
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              All payments and advance receipts logged for this customer
            </CardDescription>
          </div>
          {activeInvoice && !isInvoiceFullyPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenRecordPayment(activeInvoice.id)}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Receipt
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(activeInvoice ? invoicePayments : allPayments).length === 0 ? (
            <div className="py-10 text-center space-y-2 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">No payments recorded yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Click &quot;Record Payment&quot; to log an advance payment,
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
                  {(activeInvoice ? invoicePayments : allPayments).map((p: any) => (
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

      {/* Credit Notes & Statutory Reversals Section */}
      <Card className="shadow-xs border-rose-200/60 dark:border-rose-950">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Statutory Credit Notes & GST Reversals
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Official GST Credit Notes (Sec 34 CGST Act) issued against tax invoices for cancellations, discounts, and fee revisions
            </CardDescription>
          </div>
          {activeInvoice && activeInvoice.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCreditNoteTargetInvoice(activeInvoice);
                setIsCreditNoteModalOpen(true);
              }}
              className="gap-1.5 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Issue Credit Note
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {allCustomerCreditNotes.length === 0 ? (
            <div className="py-8 text-center space-y-1.5 text-muted-foreground">
              <RotateCcw className="w-7 h-7 mx-auto opacity-30" />
              <p className="text-xs font-medium">No credit notes issued</p>
              <p className="text-[11px] max-w-sm mx-auto">
                If a booking is cancelled or adjusted post-invoicing, issue a statutory Credit Note to reverse Revenue & Output GST cleanly.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-xs">Credit Note #</TableHead>
                    <TableHead className="font-semibold text-xs">Date</TableHead>
                    <TableHead className="font-semibold text-xs">Invoice Ref</TableHead>
                    <TableHead className="font-semibold text-xs">Reason</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Tax Reversed</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Refund Disbursed</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Total Credited</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomerCreditNotes.map((cn: any) => {
                    const taxSum =
                      Number(cn.cgstAmount || 0) +
                      Number(cn.sgstAmount || 0) +
                      Number(cn.igstAmount || 0);
                    const refund = Number(cn.refundAmount || 0);
                    return (
                      <TableRow key={cn.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          {cn.creditNoteNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                          {cn.issueDate ? format(new Date(cn.issueDate), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {cn.invoice?.invoiceNumber || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {CREDIT_NOTE_REASON_NAMES[cn.reason] || cn.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={cn.status === 'REFUNDED' ? 'secondary' : 'outline'}
                            className="text-[10px] uppercase font-semibold"
                          >
                            {cn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground" suppressHydrationWarning>
                          {taxSum > 0 ? `-${formatMoney(taxSum)}` : '₹0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400" suppressHydrationWarning>
                          {refund > 0 ? formatMoney(refund) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600 dark:text-rose-400" suppressHydrationWarning>
                          -{formatMoney(Number(cn.grandTotal))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                {activeInvoice?.invoiceNumber}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          {/* Invoice Summary Header in Modal */}
          {activeInvoice && (
            <div className="bg-muted/60 p-3.5 rounded-lg border grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Invoice Total</span>
                <span
                  className="font-bold text-sm font-mono text-foreground"
                  suppressHydrationWarning
                >
                  {formatMoney(invoiceGrandTotal)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Remaining Balance</span>
                <span
                  className="font-bold text-sm font-mono text-rose-600 dark:text-rose-400"
                  suppressHydrationWarning
                >
                  {formatMoney(invoiceBalanceDue)}
                </span>
              </div>
            </div>
          )}

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
                <Label htmlFor="custPaymentAmount">Amount (₹) *</Label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(invoiceBalanceDue.toString())}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Full Balance ({formatMoney(invoiceBalanceDue)})
                  </button>
                  {invoiceBalanceDue > 1000 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(Math.round(invoiceBalanceDue * 0.5).toString())
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      50%
                    </button>
                  )}
                </div>
              </div>
              <Input
                id="custPaymentAmount"
                type="number"
                min="1"
                max={invoiceBalanceDue}
                step="0.01"
                placeholder={`Enter amount up to ₹${invoiceBalanceDue}`}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setFormError(null);
                }}
                required
                className="font-mono text-base font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Maximum payable for this invoice: {formatMoney(invoiceBalanceDue)}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="custPaymentMethod">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger id="custPaymentMethod" className="w-full">
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
              <Label htmlFor="custTransactionRef">Transaction Reference / UTR</Label>
              <Input
                id="custTransactionRef"
                type="text"
                placeholder="e.g., UPI-94820392 or UTR12345678 or Cash Memo #12"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="custPaymentDate">Payment Date</Label>
              <Input
                id="custPaymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="font-mono"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="custPaymentNotes">Notes / Remarks</Label>
              <Input
                id="custPaymentNotes"
                type="text"
                placeholder="e.g., Advance receipt for shoot lock"
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
                  Number(paymentAmount) > invoiceBalanceDue
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

      {/* Statutory Credit Note & Reversal Modal */}
      <CreditNoteModal
        isOpen={isCreditNoteModalOpen}
        onClose={() => {
          setIsCreditNoteModalOpen(false);
          setCreditNoteTargetInvoice(null);
        }}
        invoice={creditNoteTargetInvoice}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
