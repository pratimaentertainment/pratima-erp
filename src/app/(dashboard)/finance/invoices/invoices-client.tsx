'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/currency';
import { toast } from 'sonner';
import { PaymentMethod, InvoiceStatus, AccountType } from '@prisma/client';
import { recordPaymentAction } from '@/actions/finance.actions';
import { CreditNoteModal } from '@/features/finance/components/CreditNoteModal';

import {
  Receipt,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  Download,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface InvoicesClientProps {
  initialInvoices: any[];
  tenantInfo: any;
  sourceAccounts: Array<{ id: string; name: string; code: string | null; type: AccountType }>;
}

export function InvoicesClient({
  initialInvoices,
  tenantInfo,
  sourceAccounts,
}: InvoicesClientProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'AMOUNT_DESC' | 'BALANCE_DESC'>('NEWEST');
  const [isRefreshing, startRefreshTransition] = useTransition();

  // Modals state
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [selectedInvoiceForCredit, setSelectedInvoiceForCredit] = useState<any | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, startPaymentTransition] = useTransition();

  // Executive KPI Aggregations
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalBalanceDue = 0;
    let totalTaxBilled = 0;
    let overdueCount = 0;
    let activeInvoicesCount = 0;

    const now = new Date();

    invoices.forEach((inv) => {
      const grandTotal = Number(inv.grandTotal || 0);
      const paid = Number(inv.paidAmount || 0);
      const balance = Number(inv.balanceDue || 0);
      const tax =
        Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0);

      if (inv.status !== 'CANCELLED') {
        totalInvoiced += grandTotal;
        totalPaid += paid;
        totalBalanceDue += balance;
        totalTaxBilled += tax;
        activeInvoicesCount += 1;

        if (balance > 0 && inv.dueDate && new Date(inv.dueDate) < now) {
          overdueCount += 1;
        }
      }
    });

    const collectionRate =
      totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalBalanceDue,
      totalTaxBilled,
      overdueCount,
      activeInvoicesCount,
      collectionRate,
    };
  }, [invoices]);

  // Filter & Sort Invoices
  const filteredInvoices = useMemo(() => {
    let list = invoices.filter((inv) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'UNPAID') {
          if (inv.status !== 'UNPAID' && inv.status !== 'SENT') return false;
        } else if (statusFilter === 'PARTIAL') {
          if (inv.status !== 'PARTIALLY_PAID' && inv.status !== 'PARTIAL') return false;
        } else if (statusFilter === 'PAID') {
          if (inv.status !== 'PAID') return false;
        } else if (statusFilter === 'CANCELLED') {
          if (inv.status !== 'CANCELLED') return false;
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invNum = (inv.invoiceNumber || '').toLowerCase();
        const custName = `${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''}`.toLowerCase();
        const company = (inv.customer?.companyName || '').toLowerCase();
        const quoteId = (inv.quotation?.id || '').toLowerCase();
        const phone = (inv.customer?.phone || '').toLowerCase();

        return (
          invNum.includes(q) ||
          custName.includes(q) ||
          company.includes(q) ||
          quoteId.includes(q) ||
          phone.includes(q)
        );
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'AMOUNT_DESC') {
        return Number(b.grandTotal || 0) - Number(a.grandTotal || 0);
      }
      if (sortBy === 'BALANCE_DESC') {
        return Number(b.balanceDue || 0) - Number(a.balanceDue || 0);
      }
      // NEWEST
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return list;
  }, [invoices, statusFilter, searchQuery, sortBy]);

  // Open Payment Modal
  const handleOpenPayment = (inv: any) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentAmount(String(Number(inv.balanceDue || 0)));
    setPaymentMethod(PaymentMethod.UPI);
    setTransactionRef('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    const numAmount = parseFloat(paymentAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    startPaymentTransition(async () => {
      try {
        const res = await recordPaymentAction({
          invoiceId: selectedInvoiceForPayment.id,
          amount: numAmount,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        });

        if (res.success) {
          toast.success(`Payment of ${formatMoney(numAmount)} recorded successfully!`);
          setPaymentModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to record payment');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error occurred while recording payment');
      }
    });
  };

  // Open Credit Note Modal
  const handleOpenCreditNote = (inv: any) => {
    setSelectedInvoiceForCredit(inv);
    setCreditNoteModalOpen(true);
  };

  // Export Filtered to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error('No invoices to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Issue Date',
      'Due Date',
      'Customer Name',
      'Company',
      'Customer GSTIN',
      'Place of Supply',
      'Subtotal',
      'Tax Amount',
      'Grand Total',
      'Paid Amount',
      'Balance Due',
      'Status',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.issueDate ? format(new Date(inv.issueDate), 'yyyy-MM-dd') : ''}"`,
      `"${inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : ''}"`,
      `"${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''}"`.trim(),
      `"${inv.customer?.companyName || ''}"`,
      `"${inv.customer?.gstin || ''}"`,
      `"${inv.placeOfSupply || ''}"`,
      Number(inv.subtotal || 0).toFixed(2),
      Number(inv.taxAmount || 0).toFixed(2),
      Number(inv.grandTotal || 0).toFixed(2),
      Number(inv.paidAmount || 0).toFixed(2),
      Number(inv.balanceDue || 0).toFixed(2),
      `"${inv.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pratima_ERP_Invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices CSV export downloaded.');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'PARTIALLY_PAID':
      case 'PARTIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            Partially Paid
          </Badge>
        );
      case 'UNPAID':
      case 'SENT':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-300 text-[10px] font-semibold">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Invoices & Receivables</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              Accounts Receivable Engine
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Studio-wide commercial billing registry, customer receivables aging, and statutory GST output tax schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startRefreshTransition(() => {
                router.refresh();
                toast.success('Invoices refreshed');
              });
            }}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Financial Overview Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Invoiced</span>
              <Receipt className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground font-mono" suppressHydrationWarning>
              {formatMoney(summary.totalInvoiced)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across {summary.activeInvoicesCount} active billing invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Outstanding AR Balance</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono" suppressHydrationWarning>
              {formatMoney(summary.totalBalanceDue)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.overdueCount > 0 ? (
                <span className="text-rose-600 font-medium">
                  {summary.overdueCount} overdue invoice{summary.overdueCount > 1 ? 's' : ''}
                </span>
              ) : (
                '0 overdue invoices'
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Collections</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono" suppressHydrationWarning>
              {formatMoney(summary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.collectionRate}% overall collection rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Statutory GST Billed</span>
              <Percent className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground font-mono" suppressHydrationWarning>
              {formatMoney(summary.totalTaxBilled)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accrued in Ledgers #2040, #2050, #2060
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-5 w-full md:w-auto text-xs">
              <TabsTrigger value="ALL" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="UNPAID" className="text-xs">Unpaid</TabsTrigger>
              <TabsTrigger value="PARTIAL" className="text-xs">Partial</TabsTrigger>
              <TabsTrigger value="PAID" className="text-xs">Paid</TabsTrigger>
              <TabsTrigger value="CANCELLED" className="text-xs">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 flex-1 md:max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, client name, phone, quote #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <Select
              value={sortBy}
              onValueChange={(val: any) => {
                if (val) setSortBy(val);
              }}
            >
              <SelectTrigger className="w-[150px] text-xs h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWEST" className="text-xs">Newest First</SelectItem>
                <SelectItem value="AMOUNT_DESC" className="text-xs">Highest Amount</SelectItem>
                <SelectItem value="BALANCE_DESC" className="text-xs">Highest Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global Invoices Table */}
        <Card className="shadow-xs overflow-hidden">
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm font-semibold">No invoices found matching criteria</p>
                <p className="text-xs max-w-sm mx-auto">
                  Try clearing your search query or switching status tabs to locate invoices.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold text-xs">Invoice #</TableHead>
                      <TableHead className="font-semibold text-xs">Customer</TableHead>
                      <TableHead className="font-semibold text-xs">Dates</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Tax (GST)</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Grand Total</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Balance Due</TableHead>
                      <TableHead className="font-semibold text-xs text-center w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => {
                      const grandTotal = Number(inv.grandTotal || 0);
                      const paidAmount = Number(inv.paidAmount || 0);
                      const balanceDue = Number(inv.balanceDue || 0);
                      const taxTotal =
                        Number(inv.cgstAmount || 0) +
                        Number(inv.sgstAmount || 0) +
                        Number(inv.igstAmount || 0);
                      const isOverdue =
                        balanceDue > 0 && inv.dueDate && new Date(inv.dueDate) < new Date();
                      const customerName =
                        `${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''}`.trim() ||
                        'Direct Client';

                      return (
                        <TableRow key={inv.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            <div>{inv.invoiceNumber}</div>
                            {inv.quotation && (
                              <div className="text-[10px] text-muted-foreground font-mono font-normal">
                                Quote #{inv.quotation.id?.slice(0, 8)}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{customerName}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {inv.customer?.companyName && <span>{inv.customer.companyName} •</span>}
                              <span>{inv.customer?.phone || 'No phone'}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs" suppressHydrationWarning>
                            <div className="text-muted-foreground">
                              {inv.issueDate ? format(new Date(inv.issueDate), 'dd MMM yyyy') : '—'}
                            </div>
                            {inv.dueDate && (
                              <div
                                className={`text-[10px] ${
                                  isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'
                                }`}
                              >
                                Due: {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                                {isOverdue && ' (Overdue)'}
                              </div>
                            )}
                          </TableCell>

                          <TableCell>{renderStatusBadge(inv.status)}</TableCell>

                          <TableCell className="text-right text-xs font-mono text-muted-foreground" suppressHydrationWarning>
                            <div>{taxTotal > 0 ? formatMoney(taxTotal) : '₹0.00'}</div>
                            <div className="text-[10px]">
                              {inv.isInterState ? 'IGST' : 'CGST+SGST'}
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-xs font-mono font-semibold text-foreground" suppressHydrationWarning>
                            {formatMoney(grandTotal)}
                          </TableCell>

                          <TableCell className="text-right text-xs font-mono font-bold" suppressHydrationWarning>
                            <div className={balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                              {formatMoney(balanceDue)}
                            </div>
                            {paidAmount > 0 && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                Paid: {formatMoney(paidAmount)}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {inv.status !== 'CANCELLED' && balanceDue > 0 && (
                                <Button
                                  size="xs"
                                  onClick={() => handleOpenPayment(inv)}
                                  className="h-7 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Record Payment Receipt"
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Pay
                                </Button>
                              )}

                              {inv.status !== 'CANCELLED' && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleOpenCreditNote(inv)}
                                  className="h-7 px-2 text-[11px] border-rose-500/30 text-rose-600 hover:bg-rose-50"
                                  title="Issue Credit Note / Cancel"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              )}

                              {inv.customerId && (
                                <Link
                                  href={`/customers/${inv.customerId}`}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="Open Customer 360"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
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
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Record Client Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Record an installment or settlement payment for Invoice{' '}
              <strong className="font-mono text-foreground">
                {selectedInvoiceForPayment?.invoiceNumber}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPayment} className="space-y-4 py-2">
            <div className="bg-muted/40 p-3 rounded-lg border text-xs flex justify-between items-center">
              <div>
                <span className="text-muted-foreground block text-[11px]">Outstanding Due</span>
                <span className="font-mono font-bold text-rose-600 text-sm" suppressHydrationWarning>
                  {formatMoney(Number(selectedInvoiceForPayment?.balanceDue || 0))}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Customer</span>
                <span className="font-medium text-foreground">
                  {selectedInvoiceForPayment?.customer?.firstName}{' '}
                  {selectedInvoiceForPayment?.customer?.lastName || ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payAmount" className="text-xs font-semibold">
                  Amount Received (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-xs font-mono h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payMethod" className="text-xs font-semibold">
                  Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: any) => {
                    if (val) setPaymentMethod(val as PaymentMethod);
                  }}
                >
                  <SelectTrigger id="payMethod" className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.UPI} className="text-xs">UPI / QR Code</SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER} className="text-xs">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value={PaymentMethod.CASH} className="text-xs">Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CARD} className="text-xs">Debit / Credit Card</SelectItem>
                    <SelectItem value={PaymentMethod.CHEQUE} className="text-xs">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payDate" className="text-xs font-semibold">
                  Payment Date
                </Label>
                <Input
                  id="payDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payRef" className="text-xs font-semibold">
                  Transaction Ref / UTR
                </Label>
                <Input
                  id="payRef"
                  placeholder="e.g., UTR-87263541"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payNotes" className="text-xs font-semibold">
                Payment Notes / Narration
              </Label>
              <Input
                id="payNotes"
                placeholder="Optional receipt notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModalOpen(false)}
                disabled={isSubmittingPayment}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Post Payment Receipt
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credit Note Modal */}
      <CreditNoteModal
        isOpen={creditNoteModalOpen}
        onClose={() => {
          setCreditNoteModalOpen(false);
          setSelectedInvoiceForCredit(null);
        }}
        invoice={selectedInvoiceForCredit}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
