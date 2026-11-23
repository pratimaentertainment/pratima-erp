'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { EntityDetailPage } from '@/components/crud/EntityDetailPage';
import { 
  EntitySidebar, 
  EntitySummary, 
  EntityTabs, 
  EntityMetadata, 
  EntityInfoGrid, 
  EntitySection, 
  EntityStatusTimeline 
} from '@/components/entity-detail';
import { StateBadge, StateTransitionMenu } from '@/components/state-machine';
import { ActionBar } from '@/components/actions';
import { PricingSummary } from '@/components/finance';
import { ActivityFeed } from '@/components/activity';
import { AuditHistory } from '@/components/audit';
import { FileGrid, FileDropzone } from '@/components/files';
import type { FileRecord } from '@/components/files';
import { FilePreviewDialog } from '@/components/document-viewer';
import { RevisionList } from '@/components/revisions';
import { WorkflowProgress } from '@/components/workflow';
import { 
  History, FileText, Download, Copy, Send, CheckCircle2, XCircle, 
  Activity, Shield, Paperclip, Printer, AlertTriangle, RefreshCw, Loader2,
  CalendarCheck2, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { changeQuotationStatusAction, createRevisionAction } from '@/actions/quotation.actions';
import { toast } from 'sonner';
import { WhatsAppShareButton } from './WhatsAppShareButton';
import { ConfirmBookingModal } from './confirm-booking-modal';

interface QuotationDetailViewProps {
  data: any;
}

export function QuotationDetailView({ data }: QuotationDetailViewProps) {
  const router = useRouter();
  const [previewFile, setPreviewFile] = React.useState<FileRecord | null>(null);
  const [confirmBookingOpen, setConfirmBookingOpen] = React.useState(false);

  // Status and Booking linkage flags
  const isAccepted = data.status === 'ACCEPTED' || data.status === 'CONVERTED';
  const canConfirmBooking = ['DRAFT', 'SENT', 'VIEWED'].includes(data.status) && !isAccepted;
  const bookingId = data.eventBooking?.id || (data as any).bookingId;
  const hasConfirmedBooking = isAccepted && !!bookingId;

  // 1. Resolve Dynamic Metadata
  const latestRev = data.latestRevision;
  const quoteNumber = data.quoteNumber || data.quotationNumber || (data.lead?.leadCode ? `${data.lead.leadCode}-R${latestRev?.revisionNumber || 1}` : `QT-${data.id?.slice(0, 8) || 'DRAFT'}`);
  
  const customerName = data.customerName || [data.lead?.customer?.firstName, data.lead?.customer?.lastName].filter(Boolean).join(' ').trim() || data.lead?.customer?.name || data.lead?.customerName || 'Valued Client';
  const customerPhone = data.customerPhone || data.lead?.customer?.phone || data.lead?.customerPhone;
  const customerEmail = data.customerEmail || data.lead?.customer?.email || data.lead?.customerEmail;
  const companyName = data.companyName || data.lead?.customer?.companyName;

  const eventType = data.eventType || data.lead?.inquiry?.eventType || 'Photography Services';
  const title = data.title || (data.lead?.inquiry?.eventType ? `${data.lead.inquiry.eventType} Photography` : 'Commercial Quotation');
  
  const subtotal = Number(data.subtotal ?? latestRev?.subtotal ?? data.totalAmount ?? 0);
  const totalDiscount = Number(data.totalDiscount ?? latestRev?.discountAmount ?? 0);
  const totalTax = Number(data.totalTax ?? latestRev?.taxAmount ?? 0);
  const grandTotal = Number(data.grandTotal ?? latestRev?.grandTotal ?? data.totalAmount ?? 0);

  const issueDate = data.createdAt ? new Date(data.createdAt) : new Date();
  const validUntil = data.validUntil || data.expiryDate ? new Date(data.validUntil || data.expiryDate) : null;
  const version = data.version || latestRev?.revisionNumber || 1;
  const items = data.items || latestRev?.items || [];
  const rawRevisions = data.revisions || (latestRev ? [latestRev] : []);

  // Rejection reason resolution from quotation, latest revision, or notes
  const rejectionReason = 
    data.rejectionReason || 
    latestRev?.revisionReason || 
    rawRevisions.find((r: any) => r.revisionReason)?.revisionReason || 
    data.notes || 
    'The client has requested modifications to this proposal scope or schedule.';

  const [isRevising, setIsRevising] = React.useState(false);
  const [isDeclining, setIsDeclining] = React.useState(false);

  const handleAcceptAndRevise = async () => {
    try {
      setIsRevising(true);

      const revisionPayload = {
        quotationId: data.id,
        revisionReason: rejectionReason,
        revisionComment: rejectionReason,
        pricingMode: (data.pricingMode || latestRev?.pricingMode || 'ITEMIZED') as any,
        lumpSumAmount: data.lumpSumAmount != null ? Number(data.lumpSumAmount) : (latestRev?.lumpSumAmount != null ? Number(latestRev.lumpSumAmount) : undefined),
        subjects: (data.subjects || []).map((s: any) => ({
          id: s.id,
          role: s.role || 'Bride',
          name: s.name,
          phone: s.phone || null,
          email: s.email || null,
          birthDate: s.birthDate || null,
          anniversaryDate: s.anniversaryDate || null,
        })),
        functions: (data.functions || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          date: f.date || null,
          venue: f.venue || null,
        })),
        deliverables: (data.deliverables || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          itemType: d.itemType || 'ALBUM',
          quantity: Number(d.quantity) || 1,
          basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
        })),
        items: items.map((item: any) => ({
          id: item.id,
          packageId: item.packageId || null,
          quotationFunctionId: item.quotationFunctionId || item.snapshotExtra?.functionReference || null,
          itemName: item.itemName || 'Photography Service',
          description: item.description || null,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          itemDiscountType: item.itemDiscountType || 'NONE',
          itemDiscountValue: Number(item.itemDiscountValue) || 0,
          lineItemType: item.lineItemType || 'STANDARD',
        })),
        discount: latestRev?.discountType && latestRev.discountType !== 'NONE' ? {
          discountType: latestRev.discountType,
          discountValue: Number(latestRev.discountValue) || 0,
          couponCode: latestRev.couponCode || undefined,
        } : undefined,
      };

      const res = await createRevisionAction(revisionPayload as any);

      if (res.success) {
        toast.success('Revision created successfully! Opening editor...');
        router.push(`/sales/quotations/${res.data.id}/edit`);
      } else {
        toast.error(res.error || 'Failed to create revision');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while creating revision');
    } finally {
      setIsRevising(false);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      setIsDeclining(true);
      const res = await changeQuotationStatusAction({
        quotationId: data.id,
        status: 'SENT',
        reason: 'Client requested changes declined by studio operator.',
      });

      if (res.success) {
        toast.success('Revision request declined. Quotation restored to Sent.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to decline revision request');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while declining request');
    } finally {
      setIsDeclining(false);
    }
  };

  // 2. Action Handlers
  const handleEdit = () => {
    router.push(`/sales/quotations/${data.id}/edit`);
  };

  const handlePrint = () => {
    window.open(`/sales/quotations/${data.id}/print`, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const publicQuoteUrl = `${window.location.origin}/quote/${data.id}`;
      navigator.clipboard.writeText(publicQuoteUrl);
      toast.success('Public quotation link copied to clipboard');
    }
  };

  const handleTransition = async (newStatus: any) => {
    try {
      const res = await changeQuotationStatusAction({
        quotationId: data.id,
        status: newStatus,
      });
      if (res.success) {
        toast.success(`Quotation marked as ${newStatus}`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update quotation status');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating status');
    }
  };

  // 3. Dynamic Workflow Progress Steps
  const getWorkflowSteps = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return [
          { id: '1', label: 'Draft', status: 'active' as const },
          { id: '2', label: 'Review', status: 'pending' as const },
          { id: '3', label: 'Sent', status: 'pending' as const },
          { id: '4', label: 'Approved', status: 'pending' as const },
        ];
      case 'REVIEW':
        return [
          { id: '1', label: 'Draft', status: 'completed' as const },
          { id: '2', label: 'Review', status: 'active' as const },
          { id: '3', label: 'Sent', status: 'pending' as const },
          { id: '4', label: 'Approved', status: 'pending' as const },
        ];
      case 'SENT':
        return [
          { id: '1', label: 'Draft', status: 'completed' as const },
          { id: '2', label: 'Review', status: 'completed' as const },
          { id: '3', label: 'Sent', status: 'active' as const },
          { id: '4', label: 'Approved', status: 'pending' as const },
        ];
      case 'APPROVED':
      case 'ACCEPTED':
      case 'CONVERTED':
        return [
          { id: '1', label: 'Draft', status: 'completed' as const },
          { id: '2', label: 'Review', status: 'completed' as const },
          { id: '3', label: 'Sent', status: 'completed' as const },
          { id: '4', label: 'Approved', status: 'completed' as const },
        ];
      case 'REJECTED':
        return [
          { id: '1', label: 'Draft', status: 'completed' as const },
          { id: '2', label: 'Review', status: 'completed' as const },
          { id: '3', label: 'Sent', status: 'completed' as const },
          { id: '4', label: 'Rejected', status: 'rejected' as const },
        ];
      default:
        return [
          { id: '1', label: 'Draft', status: 'completed' as const },
          { id: '2', label: 'Review', status: 'completed' as const },
          { id: '3', label: 'Sent', status: 'active' as const },
          { id: '4', label: 'Approved', status: 'pending' as const },
        ];
    }
  };

  // 4. Dynamic Revisions Data
  const revisionItems = rawRevisions.length > 0 ? rawRevisions.map((rev: any) => ({
    id: rev.id || `rev-${rev.revisionNumber || 1}`,
    version: rev.revisionNumber || 1,
    createdAt: rev.createdAt ? new Date(rev.createdAt) : issueDate,
    createdBy: {
      id: rev.createdById || 'u1',
      name: rev.createdBy?.name || 'Studio Staff',
    },
    status: rev.status || 'Draft',
    isCurrent: (rev.revisionNumber || 1) === version,
    reason: rev.revisionReason || rev.revisionComment || `Commercial revision snapshot #${rev.revisionNumber || 1}`,
  })) : [
    {
      id: data.id,
      version: version,
      createdAt: issueDate,
      createdBy: { id: 'u1', name: 'Studio Staff' },
      status: data.status || 'Draft',
      isCurrent: true,
      reason: 'Initial proposal snapshot',
    }
  ];

  // 5. Dynamic Activity & Timeline
  const dynamicTimeline = [
    { id: '1', title: 'Quotation Created', timestamp: issueDate, user: { name: data.createdBy?.name || 'System / Studio' } },
    ...(data.updatedAt && new Date(data.updatedAt).getTime() !== issueDate.getTime() ? [
      { id: '2', title: `Status Transition: ${data.status}`, status: data.status, timestamp: new Date(data.updatedAt) }
    ] : [])
  ];

  const dynamicActivities = [
    { 
      id: 'a-created', 
      type: 'status_change', 
      action: 'created quotation', 
      target: quoteNumber, 
      timestamp: issueDate, 
      actor: { id: 'sys', name: 'Studio System' } 
    },
    ...(data.status !== 'DRAFT' ? [{
      id: 'a-status',
      type: 'status_change',
      action: 'changed status to',
      target: data.status,
      timestamp: data.updatedAt ? new Date(data.updatedAt) : issueDate,
      actor: { id: 'sys', name: 'Authorized Staff' }
    }] : [])
  ];

  const dynamicAudit = [
    {
      id: 'au-created',
      entityId: data.id,
      entityType: 'quotation',
      action: 'create' as const,
      timestamp: issueDate,
      actor: { id: 'u1', name: data.createdBy?.name || 'Authorized User' },
      ipAddress: '127.0.0.1',
      diffs: [{ field: 'grandTotal', oldValue: 0, newValue: grandTotal }]
    }
  ];

  const dynamicFiles: FileRecord[] = [
    {
      id: `doc-${data.id}`,
      filename: `${quoteNumber}.pdf`,
      size: 1024 * 145,
      type: 'pdf',
      mimeType: 'application/pdf',
      url: `/sales/quotations/${data.id}/print`,
      state: 'Uploaded',
      uploadedAt: issueDate,
      uploadedBy: { id: 'u1', name: 'Pratima Studio' },
      version: version,
    }
  ];

  return (
    <EntityDetailPage
      header={{
        title: quoteNumber,
        subtitle: `${title} • ${customerName}`,
        breadcrumbs: "Sales / Quotations / Detail",
        statusBadge: <StateBadge state={data.status} />,
        primaryAction: (
          <div className="flex items-center gap-2">
            {canConfirmBooking && (
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirmBookingOpen(true)}
                className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Confirm Booking
              </Button>
            )}
            {hasConfirmedBooking && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/operations/bookings/${bookingId}`)}
                className="h-8 px-3.5 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                View Booking
              </Button>
            )}
            <ActionBar 
              primaryActions={[
                { id: 'edit', label: 'Edit / Revise', onClick: handleEdit }
              ]} 
            />
          </div>
        ),
        secondaryActions: (
          <div className="flex items-center gap-2">
            <WhatsAppShareButton 
              quotation={{ ...data, quoteNumber, grandTotal, clientName: customerName, clientPhone: customerPhone }} 
              phone={customerPhone}
              size="sm" 
            />
            <ActionBar 
              secondaryActions={[
                { id: 'print', label: 'Print / Save PDF', icon: <Printer className="h-4 w-4" />, onClick: handlePrint },
                { id: 'copy', label: 'Copy Public Link', icon: <Copy className="h-4 w-4" />, onClick: handleCopyLink }
              ]} 
            />
          </div>
        )
      }}
      metadata={
        <div className="space-y-6">
          <WorkflowProgress steps={getWorkflowSteps(data.status)} />
          <EntitySummary
            items={[
              { id: 'total', title: 'Grand Total', value: formatMoney(grandTotal, 'INR') },
              { id: 'valid', title: 'Valid Until', value: validUntil ? formatDate(validUntil, 'dd/MM/yyyy') : 'No Expiry' },
              { id: 'version', title: 'Revision', value: `Rev #${version}` },
              { id: 'customer', title: 'Customer', value: customerName },
            ]}
          />
        </div>
      }
      sidebar={
        <EntitySidebar>
          <EntityInfoGrid title="Status Transitions">
            <StateTransitionMenu
              transitions={[
                ...(canConfirmBooking ? [{
                  id: 'confirm-booking',
                  label: 'Confirm Booking',
                  icon: <CalendarCheck2 className="h-4 w-4 text-emerald-600" />,
                  onTransition: () => setConfirmBookingOpen(true),
                  variant: 'success' as const,
                  toState: 'Accepted',
                }] : []),
                { id: 'send', label: 'Mark Sent', icon: <Send className="h-4 w-4" />, onTransition: () => handleTransition('SENT'), toState: 'Sent' },
                { id: 'approve', label: 'Approve', icon: <CheckCircle2 className="h-4 w-4" />, onTransition: () => handleTransition('APPROVED'), variant: 'success', toState: 'Approved' },
                { id: 'reject', label: 'Reject', icon: <XCircle className="h-4 w-4" />, onTransition: () => handleTransition('REJECTED'), variant: 'danger', toState: 'Rejected' },
              ]}
            />
          </EntityInfoGrid>
          
          <EntityInfoGrid title="Actions">
            <div className="flex flex-col gap-2 w-full">
              <WhatsAppShareButton 
                quotation={{ ...data, quoteNumber, grandTotal, clientName: customerName, clientPhone: customerPhone }}
                phone={customerPhone}
                className="w-full justify-start text-xs h-9" 
              />
              <ActionBar
                secondaryActions={[
                  { id: 'print-sidebar', label: 'Print / Download PDF', icon: <Download className="h-4 w-4" />, onClick: handlePrint },
                  { id: 'copy-sidebar', label: 'Copy Public Link', icon: <Copy className="h-4 w-4" />, onClick: handleCopyLink },
                ]}
                className="flex-col items-start w-full"
              />
            </div>
          </EntityInfoGrid>

          <EntityInfoGrid title="Timeline">
            <EntityStatusTimeline events={dynamicTimeline} />
          </EntityInfoGrid>
        </EntitySidebar>
      }
    >
      <EntityTabs
        defaultTab="details"
        tabs={[
          {
            id: 'details',
            label: 'Quotation Details',
            icon: <FileText className="h-4 w-4" />,
            content: (
              <div className="space-y-6 mt-6">
                {/* 1-Click Revision Action Banner for REJECTED Quotations */}
                {data.status === 'REJECTED' && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700/80 p-5 shadow-sm transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Icon & Description */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-amber-950 dark:text-amber-100 tracking-tight">
                              Client Requested Changes
                            </h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                              Action Required
                            </span>
                          </div>
                          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            The client reviewed this proposal and requested revisions. Review their feedback below and either create a new revision or decline the request to keep the current quotation active.
                          </p>
                        </div>
                      </div>

                      {/* Right: Inline Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200 dark:border-amber-800">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDeclineRequest}
                          disabled={isDeclining || isRevising}
                          className="h-9 px-3.5 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          {isDeclining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Declining...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-600 dark:text-rose-400" />
                              Decline Request
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAcceptAndRevise}
                          disabled={isRevising || isDeclining}
                          className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                        >
                          {isRevising ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Creating Revision...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              Accept & Revise
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Dynamic Feedback Quote Box */}
                    <div className="mt-4 pt-3.5 border-t border-amber-200/80 dark:border-amber-800/80">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                        <span>Client Feedback / Notes</span>
                      </p>
                      <div className="bg-white/95 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed shadow-2xs whitespace-pre-wrap">
                        &ldquo;{rejectionReason}&rdquo;
                      </div>
                    </div>
                  </div>
                )}

                <EntityInfoGrid title="Client & Event Overview">
                  <EntityMetadata
                    columns={2}
                    items={[
                      { id: 'qno', label: 'Quote Number', value: quoteNumber },
                      { id: 'cust', label: 'Customer', value: customerName },
                      { id: 'phone', label: 'Phone', value: customerPhone || 'N/A' },
                      { id: 'email', label: 'Email', value: customerEmail || 'N/A' },
                      { id: 'event', label: 'Event / Service', value: eventType },
                      { id: 'issue', label: 'Issue Date', value: formatDate(issueDate, 'dd/MM/yyyy') },
                      { id: 'exp', label: 'Valid Until', value: validUntil ? formatDate(validUntil, 'dd/MM/yyyy') : 'No Expiry Set' },
                      { id: 'comp', label: 'Company', value: companyName || 'N/A' },
                    ]}
                  />
                </EntityInfoGrid>

                {data.notes && (
                  <EntityInfoGrid title="Special Notes & Customer Instructions">
                    <div className="p-4 rounded-xl bg-muted/40 border text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line flex items-start gap-3">
                      <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          Customer Instructions & Special Requests
                        </p>
                        <p className="text-slate-800 dark:text-slate-200">
                          {data.notes}
                        </p>
                      </div>
                    </div>
                  </EntityInfoGrid>
                )}

                <EntitySection title="Commercial Line Items">
                  <div className="border rounded-xl p-4 sm:p-6 bg-card space-y-6 shadow-sm">
                    {items.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground italic">
                        No individual line items detailed. Package-level billing applied.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3">Item / Service Component</th>
                              <th className="py-2.5 px-3 text-center">Qty</th>
                              <th className="py-2.5 px-3 text-right">Unit Price</th>
                              <th className="py-2.5 px-3 text-right">Tax</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {items.map((item: any, idx: number) => {
                              const unitPrice = Number(item.unitPrice || 0);
                              const qty = Number(item.quantity || 1);
                              const total = Number(item.calculatedTotal || item.total || (unitPrice * qty));
                              const tax = Number(item.calculatedTaxAmount || item.tax || 0);
                              return (
                                <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                  <td className="py-3 px-3">
                                    <div className="font-semibold text-foreground">
                                      {item.itemName || item.productName || item.package?.name || `Package Service #${idx + 1}`}
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono">{qty}</td>
                                  <td className="py-3 px-3 text-right font-mono">{formatMoney(unitPrice, 'INR')}</td>
                                  <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                    {tax > 0 ? `+${formatMoney(tax, 'INR')}` : '₹0.00'}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                    {formatMoney(total, 'INR')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <PricingSummary
                      subtotal={subtotal}
                      totalDiscount={totalDiscount}
                      totalTax={totalTax}
                      grandTotal={grandTotal}
                      currency="INR"
                    />
                  </div>
                </EntitySection>
              </div>
            )
          },
          {
            id: 'revisions',
            label: 'Revision History',
            icon: <History className="h-4 w-4" />,
            content: (
              <div className="space-y-6 mt-6">
                <RevisionList 
                  revisions={revisionItems}
                  onView={(id) => handlePrint()}
                  onRestore={(id) => console.log('restore', id)}
                />
              </div>
            )
          },
          {
            id: 'terms',
            label: 'Terms & Policies',
            content: (
              <div className="space-y-6 mt-6">
                <EntityInfoGrid title="Standard Quotation Terms">
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line p-4 rounded-lg bg-muted/40 border">
                    {data.terms || data.termsAndConditions || data.acceptanceTerms || 'Standard studio terms apply.'}
                  </div>
                </EntityInfoGrid>
              </div>
            )
          },
          {
            id: 'files',
            label: 'PDF & Documents',
            icon: <Paperclip className="h-4 w-4" />,
            content: (
              <div className="space-y-6 mt-6">
                <FileGrid 
                  files={dynamicFiles} 
                  onPreview={(f) => handlePrint()}
                  onDownload={(f) => handlePrint()}
                  onDelete={() => {}}
                />
              </div>
            )
          },
          {
            id: 'activity',
            label: 'Activity',
            icon: <Activity className="h-4 w-4" />,
            content: (
              <div className="space-y-6 mt-6">
                <ActivityFeed activities={dynamicActivities} />
              </div>
            )
          },
          {
            id: 'audit',
            label: 'Audit Log',
            icon: <Shield className="h-4 w-4" />,
            content: (
              <div className="space-y-6 mt-6">
                <AuditHistory records={dynamicAudit} />
              </div>
            )
          }
        ]}
      />

      {previewFile && (
        <FilePreviewDialog
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          url={previewFile.url}
          type={previewFile.type}
          filename={previewFile.filename}
        />
      )}

      <ConfirmBookingModal
        isOpen={confirmBookingOpen}
        onClose={() => setConfirmBookingOpen(false)}
        quotation={{
          id: data.id,
          quoteNumber,
          quotationNumber: quoteNumber,
          grandTotal,
          totalAmount: grandTotal,
          subtotal,
          customerName,
          clientName: customerName,
          customerPhone,
          title,
          lead: data.lead,
          functions: data.functions || [],
        }}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </EntityDetailPage>
  );
}
