'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, User, Briefcase, Phone, Mail, Building, CheckCircle, FileText, 
  Calendar as CalendarIcon, Plus, Eye, Printer, FileCheck, Loader2, CalendarCheck, MessageCircle,
  ArrowRight, ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';
import { FollowUpDialog } from './follow-up-dialog';
import { ConfirmBookingModal } from './confirm-booking-modal';
import { Badge } from '@/components/ui/badge';
import { markFollowUpCompleted } from '@/actions/follow-up.actions';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/currency';

export function LeadDetailClient({
  lead,
  timeline,
  followUps = [],
  invoices = [],
}: {
  lead: any;
  timeline: any[];
  followUps?: any[];
  invoices?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [followUpList, setFollowUpList] = useState<any[]>(followUps);

  // Sync state when followUps prop updates from server revalidation
  useEffect(() => {
    setFollowUpList(followUps);
  }, [followUps]);

  const quotations = lead.quotations || [];
  const quotationsCount = quotations.length;

  // Consolidate invoices from prop, lead.invoices, or quotation.invoice
  const invoicesList: any[] =
    invoices && invoices.length > 0
      ? invoices
      : lead.invoices && lead.invoices.length > 0
      ? lead.invoices
      : (lead.quotations || []).map((q: any) => q.invoice).filter(Boolean);

  const primaryInvoice = invoicesList[0] || null;
  const hasActiveInvoice = !!primaryInvoice;
  const invoiceBalanceDue = primaryInvoice
    ? Number(primaryInvoice.balanceDue ?? (primaryInvoice.grandTotal - (primaryInvoice.paidAmount || 0)))
    : null;
  const isInvoicePaid =
    primaryInvoice?.status === 'PAID' ||
    (invoiceBalanceDue !== null && invoiceBalanceDue <= 0);

  const confirmedBooking = (lead.eventBookings || [])[0] || null;
  const isLeadWon = lead.status === 'WON';
  const customerDashboardUrl = lead.customerId
    ? `/customers/${lead.customerId}`
    : lead.customer?.id
    ? `/customers/${lead.customer.id}`
    : '/customers';

  const whatsAppVoucherUrl = useMemo(() => {
    if (!confirmedBooking) return '';
    const phone = lead.customer?.phone || lead.customerPhone || '';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    const clientName =
      [lead.customer?.firstName, lead.customer?.lastName].filter(Boolean).join(' ').trim() ||
      lead.customerName ||
      'Valued Client';
    const dates = confirmedBooking.startDate
      ? format(new Date(confirmedBooking.startDate), 'dd MMM yyyy')
      : 'upcoming dates';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const voucherLink = `${baseUrl}/voucher/${confirmedBooking.id}`;
    const portalLink = lead.tenant?.slug
      ? `${baseUrl}/${lead.tenant.slug}/login`
      : `${baseUrl}/portal/dashboard`;

    const message = `Hello ${clientName}, your booking for ${dates} is confirmed! Here is your voucher: ${voucherLink} and you can track your journey here: ${portalLink}`;
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [confirmedBooking, lead]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'QUALIFIED': return 'bg-indigo-100 text-indigo-800';
      case 'QUOTATION_SENT': return 'bg-purple-100 text-purple-800';
      case 'NEGOTIATION': return 'bg-orange-100 text-orange-800';
      case 'WON': return 'bg-green-100 text-green-800';
      case 'LOST': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'RESCHEDULED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // KPIs calculations
  const pendingFollowUps = followUpList.filter(f => f.status === 'PENDING').length;
  const totalFollowUps = followUpList.length;
  const lastContact = followUpList.filter(f => f.status === 'COMPLETED').sort((a, b) => new Date(b.followUpDate).getTime() - new Date(a.followUpDate).getTime())[0];
  const nextFollowUp = followUpList.filter(f => f.status === 'PENDING').sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())[0];

  const handleMarkCompleted = (followUpId: string) => {
    setCompletingId(followUpId);

    // Optimistically update UI immediately
    setFollowUpList(prev => prev.map(item => 
      item.id === followUpId ? { ...item, status: 'COMPLETED', completedAt: new Date() } : item
    ));

    startTransition(async () => {
      try {
        const res = await markFollowUpCompleted(followUpId);
        if (res.success) {
          toast.success('Follow-up marked as completed');
          router.refresh();
        } else {
          setFollowUpList(followUps);
          toast.error(res.error || 'Failed to complete follow-up');
        }
      } catch (err: any) {
        setFollowUpList(followUps);
        toast.error(err?.message || 'Unexpected error completing follow-up');
      } finally {
        setCompletingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold text-muted-foreground">Status:</span>
          <Badge variant={lead.status === 'WON' ? 'default' : 'secondary'} className="font-semibold">
            {lead.status}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {lead.leadCode}
          </Badge>
          {quotationsCount > 0 ? (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">
              <FileCheck className="w-3.5 h-3.5 mr-1" />
              {quotationsCount} {quotationsCount === 1 ? 'Quotation' : 'Quotations'} Generated
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No quotations created yet</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {isLeadWon && (
            <Link href={customerDashboardUrl} className="w-full sm:w-auto">
              <Button
                size="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm w-full sm:w-auto gap-2"
              >
                <span>Go to Customer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {confirmedBooking ? (
            <>
              <Link href={`/operations/bookings/${confirmedBooking.id}`}>
                <Button
                  size="default"
                  variant="outline"
                  className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold shadow-sm w-full sm:w-auto gap-1.5"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  View Voucher
                </Button>
              </Link>

              <a
                href={whatsAppVoucherUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm h-9 px-3.5 rounded-lg shadow-sm transition-colors w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp Voucher</span>
              </a>

              <Button
                size="default"
                variant="outline"
                onClick={() => setIsBookingModalOpen(true)}
                className="font-semibold shadow-sm w-full sm:w-auto gap-1.5 text-slate-700"
              >
                <CalendarCheck className="w-4 h-4 text-slate-500" />
                Update Booking
              </Button>
            </>
          ) : (
            <Button
              size="default"
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm w-full sm:w-auto gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" />
              Confirm Booking
            </Button>
          )}

          <Link href={`/quotations/create/${lead.id}`} className="w-full sm:w-auto">
            <Button
              size="default"
              variant="outline"
              className="font-semibold shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Quotation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
              <TabsTrigger value="details">Lead Details</TabsTrigger>
              <TabsTrigger value="quotations" className="relative">
                Quotations
                {quotationsCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {quotationsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="followups">
                Follow-Ups
                {pendingFollowUps > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">
                    {pendingFollowUps}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          
          <TabsContent value="details" className="space-y-6 mt-6">
            {/* WON State Smart Handoff Card */}
            {isLeadWon && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/20 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                      Deal Won • Customer Handoff Complete
                    </h4>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                      This lead has converted to a customer. Full financial ledger, invoices, projects, and deliverables are managed on the Customer Dashboard.
                    </p>
                  </div>
                </div>
                <Link href={customerDashboardUrl} className="shrink-0 w-full sm:w-auto">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm w-full sm:w-auto gap-1.5 h-9"
                  >
                    <span>Go to Customer Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Customer Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Customer Information
                </CardTitle>
                {isLeadWon && (
                  <Link href={customerDashboardUrl}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold gap-1.5 h-8"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      Customer 360
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Name</span>
                  <span className="font-medium">
                    {[lead.customer?.firstName, lead.customer?.lastName].filter(Boolean).join(' ').trim() || lead.customer?.name || lead.customerName || 'Unknown Client'}
                  </span>
                  {lead.customer?.customerCode && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">({lead.customer.customerCode})</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</span>
                  <span>{lead.customer?.phone || lead.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</span>
                  <span>{lead.customer?.email || lead.customerEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 flex items-center gap-1"><Building className="w-3 h-3"/> Company</span>
                  <span>{lead.customer?.companyName || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Lead/Deal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  Deal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Stage</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Probability</span>
                  <span>{lead.probability}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Expected Revenue</span>
                  <span className="font-medium text-green-600">{lead.expectedRevenue ? `₹${lead.expectedRevenue}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Assigned Executive</span>
                  <span>{lead.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Quotations</span>
                  {quotationsCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700 dark:text-purple-300">{quotationsCount} Generated</span>
                      <Link href={`/quotations/create/${lead.id}`} className="text-xs font-semibold text-primary hover:underline">
                        + New Quote
                      </Link>
                    </div>
                  ) : (
                    <Link href={`/quotations/create/${lead.id}`} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Create Quote
                    </Link>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Invoice Status</span>
                  {hasActiveInvoice ? (
                    <div className="flex items-center gap-1.5 font-medium">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          isInvoicePaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {primaryInvoice.status}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
                        ({formatMoney(invoiceBalanceDue)} due)
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not Invoiced</span>
                  )}
                </div>
                
                {/* Embedded Follow-up KPIs */}
                <div className="col-span-2 pt-4 border-t mt-2 grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground block mb-1 text-xs">Last Contact</span>
                    <span className="font-medium">{lastContact ? format(new Date(lastContact.followUpDate), 'PP') : 'None'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 text-xs">Next Follow-up</span>
                    <span className="font-medium text-blue-600">{nextFollowUp ? format(new Date(nextFollowUp.followUpDate), 'PP') : 'Not Scheduled'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 text-xs">Total / Pending</span>
                    <span className="font-medium">{totalFollowUps} / {pendingFollowUps}</span>
                  </div>
                </div>

              </CardContent>
            </Card>
            
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {lead.notes || 'No notes available.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Quotations & Proposals</h2>
                <p className="text-xs text-muted-foreground">Commercial quotes generated for this lead</p>
              </div>
              <Link href={`/quotations/create/${lead.id}`}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Quotation
                </Button>
              </Link>
            </div>

            {quotations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-base">No Quotations Generated Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Generate a tailored commercial quotation for this client with automated pricing, taxes, and package items.
                  </p>
                  <Link href={`/quotations/create/${lead.id}`}>
                    <Button className="mt-2">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Quotation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {quotations.map((quote: any) => {
                  const latestRev = quote.quotationRevisions?.[0];
                  const grandTotal = latestRev?.grandTotal || quote.totalAmount || 0;
                  return (
                    <Card key={quote.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              quote.status === 'ACCEPTED' || quote.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : quote.status === 'SENT'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : quote.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {quote.status}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              Rev #{latestRev?.revisionNumber || 1}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(quote.createdAt), 'PP')}
                            </span>
                          </div>
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100" suppressHydrationWarning>
                            ₹{Number(grandTotal).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Link href={`/sales/quotations/${quote.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              View Detail
                            </Button>
                          </Link>
                          <Link href={`/sales/quotations/${quote.id}/print`} target="_blank">
                            <Button variant="outline" size="sm">
                              <Printer className="w-3.5 h-3.5 mr-1.5" />
                              Print / PDF
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followups" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Follow-Up History</h2>
              <Button onClick={() => setIsFollowUpDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Follow-Up
              </Button>
            </div>
            
            <div className="space-y-4">
              {followUpList.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No follow-ups scheduled yet.
                  </CardContent>
                </Card>
              ) : (
                followUpList.map(followUp => {
                  const isItemCompleting = isPending && completingId === followUp.id;
                  return (
                    <Card key={followUp.id} className={followUp.status === 'COMPLETED' ? 'bg-muted/30 border-dashed' : undefined}>
                      <CardContent className="p-4 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getFollowUpStatusColor(followUp.status)}`}>
                              {followUp.status}
                            </span>
                            <span className="text-sm font-semibold">{followUp.type}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(followUp.followUpDate), 'PP p')}
                            </span>
                            {followUp.completedAt && (
                              <span className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800">
                                Completed: {format(new Date(followUp.completedAt), 'PP p')}
                              </span>
                            )}
                          </div>
                          {followUp.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{followUp.notes}</p>
                          )}
                          {followUp.outcome && (
                            <p className="text-xs text-muted-foreground mt-2 font-medium">Outcome: {followUp.outcome}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {followUp.status === 'PENDING' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={isItemCompleting}
                              onClick={() => handleMarkCompleted(followUp.id)}
                              className="hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950 transition-colors"
                            >
                              {isItemCompleting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Completing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                  Mark Completed
                                </>
                              )}
                            </Button>
                          )}
                          {followUp.status === 'COMPLETED' && (
                            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Column: Timeline */}
      <div className="md:col-span-1 space-y-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
              {timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground pl-4">No activities logged yet.</div>
              ) : (
                timeline.map((entry, idx) => (
                  <div key={entry.id} className="mb-6 ml-6 relative">
                    <span className="absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                      <CheckCircle className="w-3 h-3 text-blue-600" />
                    </span>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-gray-900">{entry.action}</span>
                      {entry.notes && (
                        <p className="text-sm text-gray-600">{entry.notes}</p>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        {format(new Date(entry.createdAt), 'PP p')}
                        {entry.createdBy && (
                          <>
                            <span>•</span>
                            <span>{entry.createdBy.name}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isFollowUpDialogOpen && (
        <FollowUpDialog 
          leadId={lead.id} 
          onClose={() => {
            setIsFollowUpDialogOpen(false);
            router.refresh();
          }} 
        />
      )}

      <ConfirmBookingModal
        lead={lead}
        isOpen={isBookingModalOpen}
        onOpenChange={setIsBookingModalOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />
      </div>
    </div>
  );
}
