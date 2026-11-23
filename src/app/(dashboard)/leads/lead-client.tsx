'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  Phone,
  MessageSquare,
  CheckCircle2,
  FileText,
  LayoutList,
  Columns3,
  Search,
  Clock,
  Calendar,
  Tag,
  User as UserIcon,
  GripVertical,
  Sparkles,
  X,
  Share2,
} from 'lucide-react';
import { TransferLeadModal, type LeadForTransfer } from '@/components/features/franchise/TransferLeadModal';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateLead, deleteLead, confirmLeadBooking } from '@/actions/lead.actions';
import { toast } from 'sonner';
import { format } from 'date-fns';

type LeadStatusType = 'NEW' | 'QUALIFIED' | 'QUOTATION_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';

interface KanbanStage {
  key: LeadStatusType;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  headerBorder: string;
  columnBg: string;
}

const KANBAN_STAGES: KanbanStage[] = [
  {
    key: 'NEW',
    label: 'New Lead',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    badgeText: 'text-blue-700 dark:text-blue-300',
    headerBorder: 'border-t-blue-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
  {
    key: 'QUALIFIED',
    label: 'Qualified',
    dotColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    headerBorder: 'border-t-indigo-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
  {
    key: 'QUOTATION_SENT',
    label: 'Quotation Sent',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    badgeText: 'text-purple-700 dark:text-purple-300',
    headerBorder: 'border-t-purple-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
  {
    key: 'NEGOTIATION',
    label: 'Negotiation',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    badgeText: 'text-amber-700 dark:text-amber-300',
    headerBorder: 'border-t-amber-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
  {
    key: 'WON',
    label: 'Won / Booked',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    headerBorder: 'border-t-emerald-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
  {
    key: 'LOST',
    label: 'Lost',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    badgeText: 'text-rose-700 dark:text-rose-300',
    headerBorder: 'border-t-rose-500',
    columnBg: 'bg-slate-50/60 dark:bg-slate-900/30',
  },
];

function formatINR(val?: number | string | null): string {
  if (val === null || val === undefined) return '₹0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export interface SerializedLead {
  id: string;
  tenantId: string;
  branchId: string;
  leadCode: string;
  customerId: string;
  inquiryId?: string | null;
  packageId?: string | null;
  assignedToId?: string | null;
  status: LeadStatusType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  probability: number;
  expectedRevenue: number | null;
  expectedBookingDate?: Date | string | null;
  lostReason?: string | null;
  notes?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  deletedById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  customer?: any;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  assignedTo?: any;
  package?: any;
  inquiry?: any;
  quotations?: any[];
  followUps?: any[];
  [key: string]: any;
}

export interface LeadClientProps {
  initialData: SerializedLead[];
  users: any[];
  packages: any[];
  franchisees?: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  }>;
}

export function LeadClient({
  initialData,
  users,
  packages,
  franchisees = [],
}: LeadClientProps) {
  const [data, setData] = React.useState<SerializedLead[]>(initialData);
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [transferLead, setTransferLead] = React.useState<LeadForTransfer | null>(null);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = React.useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<LeadStatusType | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(false);

  // Search Filter
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const customerName = [item.customer?.firstName, item.customer?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || item.customer?.name || item.customerName || '';
      const phone = item.customer?.phone || item.customerPhone || '';
      const email = item.customer?.email || '';
      const leadCode = item.leadCode || '';
      const pkgName = item.package?.name || '';
      const assignedName = item.assignedTo?.name || '';

      return (
        leadCode.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        pkgName.toLowerCase().includes(q) ||
        assignedName.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  // Overall Pipeline Stats
  const totalPipelineRevenue = React.useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (Number(curr.expectedRevenue) || 0), 0);
  }, [filteredData]);

  const wonRevenue = React.useMemo(() => {
    return filteredData
      .filter((l) => l.status === 'WON')
      .reduce((acc, curr) => acc + (Number(curr.expectedRevenue) || 0), 0);
  }, [filteredData]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatusType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent, status: LeadStatusType) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColumn === status) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatusType) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    setDraggedLeadId(null);

    if (!leadId) return;

    const currentLead = data.find((l) => l.id === leadId);
    if (!currentLead || currentLead.status === newStatus) return;

    const previousData = [...data];
    const stageInfo = KANBAN_STAGES.find((s) => s.key === newStatus);

    // 1. Optimistic Update
    setData((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    // 2. Background Server Action Call
    try {
      const res = await updateLead(leadId, { status: newStatus });
      if (res.success) {
        toast.success(`Moved ${currentLead.leadCode} to ${stageInfo?.label || newStatus}`);
        if (res.lead) {
          setData((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    ...res.lead,
                    customer: res.lead.customer || l.customer,
                    package: res.lead.package || l.package,
                    assignedTo: res.lead.assignedTo || l.assignedTo,
                  }
                : l
            )
          );
        }
      } else {
        // Rollback on server failure
        setData(previousData);
        toast.error(res.error || 'Failed to update stage');
      }
    } catch (err: any) {
      // Rollback on network / unexpected error
      setData(previousData);
      toast.error(err.message || 'Error occurred while moving lead');
    }
  };

  // Dialog & Action Handlers
  const handleOpenDialog = (record: any) => {
    setEditingId(record.id);
    setFormData({
      status: record.status,
      priority: record.priority,
      probability: record.probability?.toString() || '50',
      expectedRevenue: record.expectedRevenue?.toString() || '',
      expectedBookingDate: record.expectedBookingDate
        ? format(new Date(record.expectedBookingDate), 'yyyy-MM-dd')
        : '',
      packageId: record.packageId || 'none',
      assignedToId: record.assignedToId || 'none',
      lostReason: record.lostReason || '',
      notes: record.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const payload = {
        ...formData,
        probability: parseInt(formData.probability || '50', 10),
        expectedRevenue: formData.expectedRevenue ? parseFloat(formData.expectedRevenue) : null,
        expectedBookingDate: formData.expectedBookingDate
          ? new Date(formData.expectedBookingDate)
          : null,
        packageId: formData.packageId === 'none' ? null : formData.packageId,
        assignedToId: formData.assignedToId === 'none' ? null : formData.assignedToId,
      };

      const res = await updateLead(editingId, payload);
      if (res.success) {
        toast.success('Updated successfully');
        setData((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...res.lead,
                  customer: res.lead.customer || item.customer,
                  package: res.lead.package || item.package,
                  assignedTo: res.lead.assignedTo || item.assignedTo,
                }
              : item
          )
        );
        setIsDialogOpen(false);
      } else {
        toast.error(res.error || 'Failed to update');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    const res = await deleteLead(id);
    if (res.success) {
      toast.success('Deleted successfully');
      setData((prev) => prev.filter((item) => item.id !== id));
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  };

  const handleConfirmBooking = async (leadId: string) => {
    if (
      !confirm(
        'Confirm booking for this lead? This will mark the lead as WON, transition the client into the Customer module, and generate their customer portal access.'
      )
    ) {
      return;
    }
    const res = await confirmLeadBooking(leadId);
    if (res.success) {
      toast.success('Booking confirmed! Client transitioned to Customer module with portal access.');
      setData((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? { ...item, ...res.lead, customer: res.lead.customer || item.customer }
            : item
        )
      );
    } else {
      toast.error(res.error || 'Failed to confirm booking');
    }
  };

  return (
    <div className="space-y-5">
      {/* Control & Header Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card border rounded-xl p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads, clients, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stats Summary & View Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium border-r pr-4 mr-1">
            <div>
              <span className="text-muted-foreground">Total Pipeline: </span>
              <span className="font-semibold text-foreground">{formatINR(totalPipelineRevenue)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Won: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINR(wonRevenue)}
              </span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[calc(100vh-280px)] select-none">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredData.filter((l) => l.status === stage.key);
            const stageRevenue = stageLeads.reduce(
              (acc, curr) => acc + (Number(curr.expectedRevenue) || 0),
              0
            );
            const isColumnHovered = dragOverColumn === stage.key;

            return (
              <div
                key={stage.key}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={(e) => handleDragLeave(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`w-[320px] flex-shrink-0 flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs transition-all duration-200 ${
                  stage.headerBorder
                } border-t-4 ${
                  isColumnHovered
                    ? 'ring-2 ring-primary/40 bg-primary/5 border-primary/50 scale-[1.008]'
                    : 'hover:border-border'
                }`}
              >
                {/* Stage Header */}
                <div className="p-3 border-b bg-card/90 rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                    <h3 className="text-xs font-semibold tracking-tight text-foreground">
                      {stage.label}
                    </h3>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stage.badgeBg}`}
                    >
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground">
                      {formatINR(stageRevenue)}
                    </span>
                  </div>
                </div>

                {/* Cards Container / Drop Zone */}
                <div className="p-2 space-y-3 flex-1 min-h-[480px] max-h-[calc(100vh-320px)] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div
                      className={`h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center transition-colors ${
                        isColumnHovered
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-muted-foreground/20 text-muted-foreground/60'
                      }`}
                    >
                      <p className="text-xs font-medium">No leads in this stage</p>
                      <p className="text-[11px] mt-1">Drop leads here to update stage</p>
                    </div>
                  ) : (
                    stageLeads.map((item) => {
                      const customerName =
                        [item.customer?.firstName, item.customer?.lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim() ||
                        item.customer?.name ||
                        item.customerName ||
                        'Unknown Client';
                      const customerPhone =
                        item.customer?.phone || item.customerPhone || '';
                      const customerEmail =
                        item.customer?.email || item.customerEmail || '';
                      const waCleanPhone = cleanPhoneNumber(customerPhone);
                      const isBeingDragged = draggedLeadId === item.id;

                      // Follow-up snippet resolution
                      const pendingFollowUp = item.followUps?.find(
                        (f: any) => f.status === 'PENDING'
                      );
                      const latestFollowUp = item.followUps?.[0];

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`group rounded-lg border bg-card p-3.5 shadow-xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing space-y-3 ${
                            isBeingDragged
                              ? 'opacity-40 scale-[0.98] border-dashed border-primary shadow-none'
                              : 'hover:border-primary/40'
                          }`}
                        >
                          {/* Card Top: Code, Prob Badge, Drag Grip */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                              <a
                                href={`/leads/${item.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {item.leadCode}
                              </a>
                            </div>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {item.probability || 50}% Prob
                            </span>
                          </div>

                          {/* Customer Name & Contact */}
                          <div>
                            <h4
                              className="text-sm font-semibold text-foreground truncate"
                              title={customerName}
                            >
                              {customerName}
                            </h4>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {customerPhone || customerEmail || 'No contact specified'}
                            </div>
                          </div>

                          {/* Financials & Package Details */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
                            <div>
                              <div className="text-[11px] text-muted-foreground font-medium">
                                Expected Rev
                              </div>
                              <div className="text-sm font-bold text-foreground">
                                {formatINR(item.expectedRevenue)}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {item.package?.name && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground max-w-[130px] truncate">
                                  <Tag className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.package.name}</span>
                                </span>
                              )}
                              {item.inquiry?.leadSource?.name && (
                                <span className="inline-flex items-center text-[10px] text-muted-foreground">
                                  <Sparkles className="w-2.5 h-2.5 mr-0.5 shrink-0 text-amber-500" />
                                  {item.inquiry.leadSource.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Follow-up / Timeline snippet */}
                          <div className="pt-1">
                            {pendingFollowUp ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  Next:{' '}
                                  {format(
                                    new Date(pendingFollowUp.followUpDate),
                                    'dd MMM yyyy'
                                  )}
                                </span>
                              </div>
                            ) : latestFollowUp ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  Last:{' '}
                                  {format(
                                    new Date(latestFollowUp.followUpDate),
                                    'dd MMM'
                                  )}{' '}
                                  ({latestFollowUp.status.toLowerCase()})
                                </span>
                              </div>
                            ) : item.expectedBookingDate ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  Event:{' '}
                                  {format(
                                    new Date(item.expectedBookingDate),
                                    'dd MMM yyyy'
                                  )}
                                </span>
                              </div>
                            ) : item.notes ? (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/20 px-2 py-1 rounded-md">
                                &quot;{item.notes}&quot;
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground/60 italic">
                                No follow-up scheduled
                              </div>
                            )}
                          </div>

                          {/* Executive & Quick Actions Toolbar */}
                          <div className="flex items-center justify-between gap-1 pt-2 border-t">
                            <div
                              className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[100px]"
                              title={`Assigned: ${item.assignedTo?.name || 'Unassigned'}`}
                            >
                              <UserIcon className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {item.assignedTo?.name || 'Unassigned'}
                              </span>
                            </div>

                            {/* Direct Action Buttons */}
                            <div className="flex items-center gap-1">
                              {/* WhatsApp Button */}
                              {waCleanPhone ? (
                                <a
                                  href={`https://wa.me/${waCleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              ) : null}

                              {/* Direct Phone Call Button */}
                              {customerPhone ? (
                                <a
                                  href={`tel:${customerPhone}`}
                                  title="Call Client"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              ) : null}

                              {/* Create Quotation Button */}
                              <a
                                href={`/quotations/create/${item.id}`}
                                title="Create Quotation"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                              </a>

                              {/* Confirm Booking / Booked */}
                              {item.status === 'WON' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                  Booked
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmBooking(item.id);
                                  }}
                                  className="h-6 px-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  title="Confirm Booking & Activate Portal"
                                >
                                  Confirm
                                </Button>
                              )}

                              {/* Transfer to Franchisee Studio (if Franchisor) */}
                              {franchisees && franchisees.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferLead({
                                      id: item.id,
                                      leadCode: item.leadCode,
                                      customerName:
                                        [item.customer?.firstName, item.customer?.lastName]
                                          .filter(Boolean)
                                          .join(' ') ||
                                        item.customer?.name ||
                                        item.customerName,
                                      phone: item.customer?.phone || item.customerPhone,
                                      eventType: item.eventType,
                                    });
                                  }}
                                  title="Transfer Lead to Franchisee Studio"
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              )}

                              {/* Edit Modal */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDialog(item);
                                }}
                                title="Edit Lead"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>

                              {/* Delete Lead */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DATA TABLE / LIST VIEW */}
      {viewMode === 'list' && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Executive</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Follow-ups</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No leads found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const customerName =
                    [item.customer?.firstName, item.customer?.lastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim() ||
                    item.customer?.name ||
                    item.customerName ||
                    'Unknown Client';
                  const customerContact =
                    item.customer?.phone ||
                    item.customerPhone ||
                    item.customer?.email ||
                    'No contact info';
                  const waCleanPhone = cleanPhoneNumber(item.customer?.phone || item.customerPhone);

                  const stageInfo = KANBAN_STAGES.find((s) => s.key === item.status);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        <a
                          href={`/leads/${item.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.leadCode}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{customerName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{customerContact}</span>
                          {waCleanPhone && (
                            <a
                              href={`https://wa.me/${waCleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            stageInfo?.badgeBg || 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {stageInfo?.label || item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.package?.name || 'N/A'}</TableCell>
                      <TableCell>{item.inquiry?.leadSource?.name || 'N/A'}</TableCell>
                      <TableCell>{item.assignedTo?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {formatINR(item.expectedRevenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.probability || 50}% Prob.
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.followUps && item.followUps.length > 0 ? (
                          <div className="text-xs">
                            <div className="font-medium text-foreground">
                              {format(new Date(item.followUps[0].followUpDate), 'dd MMM yyyy')}
                            </div>
                            <div className="text-muted-foreground capitalize">
                              {item.followUps[0].status.toLowerCase()}
                            </div>
                          </div>
                        ) : item.expectedBookingDate ? (
                          <div className="text-xs text-muted-foreground">
                            Event: {format(new Date(item.expectedBookingDate), 'dd MMM yyyy')}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'WON' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Booked
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmBooking(item.id)}
                              className="h-7 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              title="Confirm Booking and activate Customer"
                            >
                              Confirm Booking
                            </Button>
                          )}
                          <a href={`/quotations/create/${item.id}`} title="Create Quotation">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </a>
                          {franchisees && franchisees.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTransferLead({
                                  id: item.id,
                                  leadCode: item.leadCode,
                                  customerName:
                                    [item.customer?.firstName, item.customer?.lastName]
                                      .filter(Boolean)
                                      .join(' ') ||
                                    item.customer?.name ||
                                    item.customerName,
                                  phone: item.customer?.phone || item.customerPhone,
                                  eventType: item.eventType,
                                });
                              }}
                              title="Transfer Lead to Franchisee Studio"
                            >
                              <Share2 className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                            title="Edit Lead"
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* EDIT LEAD DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status / Stage</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="QUOTATION_SENT">Quotation Sent</SelectItem>
                    <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability || ''}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                />
              </div>
            </div>

            {formData.status === 'LOST' && (
              <div className="space-y-2">
                <Label>Lost Reason</Label>
                <Input
                  value={formData.lostReason || ''}
                  onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                  placeholder="Why was the lead lost?"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Revenue (₹)</Label>
                <Input
                  type="number"
                  value={formData.expectedRevenue || ''}
                  onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Booking Date</Label>
                <Input
                  type="date"
                  value={formData.expectedBookingDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedBookingDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select
                value={formData.packageId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, packageId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={formData.assignedToId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, assignedToId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign executive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Unassigned --</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FRANCHISE LEAD TRANSFER MODAL */}
      <TransferLeadModal
        lead={transferLead}
        franchisees={franchisees || []}
        onClose={() => setTransferLead(null)}
      />
    </div>
  );
}
