'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, UserCheck, ArrowRight, Filter } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { deleteInquiry } from '@/actions/inquiry.actions';
import { createLeadFromInquiry } from '@/actions/lead.actions';
import { InquiryForm } from '@/features/inquiries/components/InquiryForm';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

function getSourceBadgeStyle(sourceName?: string | null) {
  if (!sourceName) {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
  const lower = sourceName.toLowerCase();
  if (lower.includes('instagram') || lower.includes('insta')) {
    return 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800';
  }
  if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }
  if (lower.includes('google') || lower.includes('search') || lower.includes('ad')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  if (lower.includes('website') || lower.includes('portal') || lower.includes('web')) {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  }
  if (lower.includes('referral') || lower.includes('word') || lower.includes('client')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (lower.includes('webhook') || lower.includes('api') || lower.includes('zapier') || lower.includes('pabbly')) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

export interface SerializedInquiry {
  id: string;
  tenantId: string;
  branchId: string;
  inquiryCode: string;
  customerId: string;
  inquiryDate: Date | string;
  eventDate?: Date | string | null;
  eventType?: string | null;
  preferredContactTime?: string | null;
  budgetRange?: string | null;
  budget?: number | null;
  leadSourceId?: string | null;
  assignedToId?: string | null;
  priority: string;
  status: string;
  notes?: string | null;
  customer?: any;
  leadSource?: any;
  assignedTo?: any;
  lead?: {
    id: string;
    leadCode: string;
    expectedRevenue?: number | null;
    status: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export interface InquiryClientProps {
  initialData: SerializedInquiry[];
  leadSources: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  currentUserId?: string;
}

export function InquiryClient({ initialData, leadSources, users, currentUserId }: InquiryClientProps) {
  const [data, setData] = React.useState<SerializedInquiry[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedInquiry, setSelectedInquiry] = React.useState<any | null>(null);
  const [viewFilter, setViewFilter] = React.useState<'active' | 'all'>('active');
  const [selectedSourceId, setSelectedSourceId] = React.useState<string>('all');
  const [convertingId, setConvertingId] = React.useState<string | null>(null);
  const router = useRouter();

  const handleConvertToLead = async (inquiryId: string) => {
    if (!confirm('Convert this inquiry into a Lead? This will create a sales pipeline record and archive the inquiry.')) {
      return;
    }

    setConvertingId(inquiryId);
    try {
      const res = await createLeadFromInquiry(inquiryId, {});
      if (res.success) {
        toast.success('Inquiry successfully converted to Lead!');
        setData((prev) =>
          prev.map((item) =>
            item.id === inquiryId ? { ...item, status: 'CONVERTED', lead: res.lead } : item
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to convert inquiry to lead');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during conversion');
    } finally {
      setConvertingId(null);
    }
  };

  const handleOpenCreate = () => {
    setSelectedInquiry(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setSelectedInquiry(record);
    setIsDialogOpen(true);
  };

  const handleSuccess = (savedRecord: any) => {
    if (selectedInquiry) {
      setData((prev) =>
        prev.map((item) => (item.id === savedRecord.id ? savedRecord : item))
      );
    } else {
      setData((prev) => [savedRecord, ...prev]);
    }
    setIsDialogOpen(false);
    setSelectedInquiry(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    const res = await deleteInquiry(id);
    if (res.success) {
      toast.success('Inquiry deleted successfully');
      setData((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  };

  // Filter inquiries based on selected view filter and lead source
  const displayedInquiries = React.useMemo(() => {
    let list = data;
    if (viewFilter === 'active') {
      list = list.filter((item) => item.status !== 'CONVERTED');
    }
    if (selectedSourceId !== 'all') {
      if (selectedSourceId === 'direct') {
        list = list.filter((item) => !item.leadSourceId && !item.leadSource);
      } else {
        list = list.filter(
          (item) => item.leadSourceId === selectedSourceId || item.leadSource?.id === selectedSourceId
        );
      }
    }
    return list;
  }, [data, viewFilter, selectedSourceId]);

  const activeCount = data.filter((item) => item.status !== 'CONVERTED').length;
  const convertedCount = data.filter((item) => item.status === 'CONVERTED').length;

  const displaySource =
    selectedSourceId === 'all'
      ? 'All Sources'
      : selectedSourceId === 'direct' || selectedSourceId === 'manual'
      ? 'Direct / Manual'
      : leadSources.find((s) => s.id === selectedSourceId)?.name || 'Filter Source';

  const sourceFilterItems = React.useMemo(() => [
    { value: 'all', label: 'All Sources' },
    { value: 'direct', label: 'Direct / Manual' },
    ...leadSources.map((s) => ({ value: s.id, label: s.name })),
  ], [leadSources]);

  return (
    <div className="space-y-4">
      {/* Header controls: Filter tabs, Source Filter dropdown, and New Inquiry CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 border rounded-lg p-1 bg-muted/40">
            <Button
              type="button"
              variant={viewFilter === 'active' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('active')}
              className="text-xs h-8 font-medium"
            >
              Active Inquiries
              <span className="ml-1.5 px-1.5 py-0.2 bg-background/80 rounded-full text-xs font-semibold">
                {activeCount}
              </span>
            </Button>
            <Button
              type="button"
              variant={viewFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('all')}
              className="text-xs h-8 font-medium"
            >
              All Inquiries
              <span className="ml-1.5 px-1.5 py-0.2 bg-background/80 rounded-full text-xs font-semibold">
                {data.length}
              </span>
            </Button>
          </div>

          <div className="flex items-center">
            <Select
              value={selectedSourceId}
              onValueChange={(val) => setSelectedSourceId(val || 'all')}
              items={sourceFilterItems}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Sources">
                  {displaySource}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="direct">Direct / Manual</SelectItem>
                {leadSources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Inquiry
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Event & Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedInquiries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {viewFilter === 'active'
                    ? 'No active inquiries found. All inquiries have been processed or converted.'
                    : 'No inquiries found.'}
                </TableCell>
              </TableRow>
            )}
            {displayedInquiries.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {item.inquiryCode}
                </TableCell>
                <TableCell className="font-medium">
                  {[item.customer?.firstName, item.customer?.lastName].filter(Boolean).join(' ').trim() || item.customer?.name || item.customerName || 'Unknown Client'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{item.customer?.phone}</div>
                  <div className="text-xs text-muted-foreground">{item.customer?.email}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`font-medium text-xs px-2.5 py-0.5 border ${getSourceBadgeStyle(item.leadSource?.name || item.source)}`}
                  >
                    {item.leadSource?.name || item.source || 'Direct / Manual'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">
                    {item.eventType || 'Unspecified'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.eventDate ? format(new Date(item.eventDate), 'PPP') : 'Date not set'}
                  </div>
                </TableCell>
                <TableCell>
                  {item.status === 'CONVERTED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <UserCheck className="w-3 h-3 mr-1" />
                      CONVERTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      {item.status}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      item.priority === 'HIGH'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : item.priority === 'LOW'
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {item.priority}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Prominent Convert to Lead button */}
                    {item.status !== 'CONVERTED' && !item.lead ? (
                      <Button
                        size="sm"
                        onClick={() => handleConvertToLead(item.id)}
                        disabled={convertingId === item.id}
                        className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        {convertingId === item.id ? 'Converting...' : 'Convert to Lead'}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/leads')}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        View Lead <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Inquiry"
                    >
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      title="Delete Inquiry"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInquiry ? 'Edit' : 'New'} Inquiry</DialogTitle>
          </DialogHeader>
          <InquiryForm
            key={selectedInquiry?.id || 'new'}
            initialData={selectedInquiry}
            leadSources={leadSources}
            users={users}
            currentUserId={currentUserId}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
