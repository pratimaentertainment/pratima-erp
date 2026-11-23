'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  completeFollowUpQuickAction,
  rescheduleFollowUpQuickAction,
} from '@/actions/follow-up-dashboard.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Check,
  Search,
  Columns3,
  LayoutList,
  User as UserIcon,
  Sparkles,
  RotateCcw,
  Tag,
  X,
  ExternalLink,
  Flame,
  CalendarDays,
  Video,
  Mail,
  Users
} from 'lucide-react';

interface FollowUpRecord {
  id: string;
  tenantId: string;
  leadId: string;
  assignedToId?: string | null;
  type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'VIDEO_CALL';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  followUpDate: string | Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string | null;
  outcome?: string | null;
  completedAt?: string | Date | null;
  lead: {
    id: string;
    leadCode: string;
    status: string;
    expectedRevenue?: number | null;
    customer?: {
      id: string;
      firstName: string;
      lastName?: string | null;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
    } | null;
    package?: {
      id: string;
      name: string;
    } | null;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface FollowUpDashboardData {
  overdue: FollowUpRecord[];
  today: FollowUpRecord[];
  upcoming: FollowUpRecord[];
  completed: FollowUpRecord[];
  stats: {
    totalPending: number;
    overdueCount: number;
    todayCount: number;
    upcomingCount: number;
    completedCount: number;
  };
}

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function FollowUpClient({ initialData }: { initialData: FollowUpDashboardData }) {
  const [data, setData] = React.useState<FollowUpDashboardData>(initialData);
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('ALL');

  // Dialog State: Quick Completion
  const [completeModalItem, setCompleteModalItem] = React.useState<FollowUpRecord | null>(null);
  const [completeOutcome, setCompleteOutcome] = React.useState<string>('INTERESTED');
  const [completeNotes, setCompleteNotes] = React.useState<string>('');
  const [isCompleting, setIsCompleting] = React.useState<boolean>(false);

  // Dialog State: Reschedule
  const [rescheduleModalItem, setRescheduleModalItem] = React.useState<FollowUpRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState<string>('');
  const [rescheduleReason, setRescheduleReason] = React.useState<string>('');
  const [isRescheduling, setIsRescheduling] = React.useState<boolean>(false);

  // Active filter helper
  const filterList = (list: FollowUpRecord[]) => {
    return list.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const customer = item.lead?.customer;
      const customerName =
        [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() ||
        customer?.name ||
        'Valued Client';
      const phone = customer?.phone || '';
      const email = customer?.email || '';
      const leadCode = item.lead?.leadCode || '';
      const assignedName = item.assignedTo?.name || item.lead?.assignedTo?.name || '';
      const notes = item.notes || '';

      const matchesSearch =
        !q ||
        customerName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        leadCode.toLowerCase().includes(q) ||
        assignedName.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q);

      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;

      return matchesSearch && matchesType && matchesPriority;
    });
  };

  const filteredOverdue = React.useMemo(() => filterList(data.overdue), [data.overdue, searchQuery, typeFilter, priorityFilter]);
  const filteredToday = React.useMemo(() => filterList(data.today), [data.today, searchQuery, typeFilter, priorityFilter]);
  const filteredUpcoming = React.useMemo(() => filterList(data.upcoming), [data.upcoming, searchQuery, typeFilter, priorityFilter]);
  const filteredCompleted = React.useMemo(() => filterList(data.completed), [data.completed, searchQuery, typeFilter, priorityFilter]);

  // Quick Complete Execution
  const handleQuickComplete = async (item: FollowUpRecord, outcome?: string, notes?: string) => {
    setIsCompleting(true);
    // Optimistic remove
    const prev = { ...data };
    setData((d) => ({
      ...d,
      overdue: d.overdue.filter((f) => f.id !== item.id),
      today: d.today.filter((f) => f.id !== item.id),
      upcoming: d.upcoming.filter((f) => f.id !== item.id),
      completed: [{ ...item, status: 'COMPLETED', completedAt: new Date(), outcome: outcome || 'OTHER' }, ...d.completed],
      stats: {
        ...d.stats,
        totalPending: Math.max(0, d.stats.totalPending - 1),
        completedCount: d.stats.completedCount + 1,
      },
    }));

    try {
      const res = await completeFollowUpQuickAction(item.id, notes, outcome);
      if (res.success) {
        toast.success(res.message || 'Follow-up completed');
        setCompleteModalItem(null);
        setCompleteNotes('');
      } else {
        setData(prev);
        toast.error(res.error || 'Failed to complete follow-up');
      }
    } catch (err: any) {
      setData(prev);
      toast.error(err.message || 'Error completing follow-up');
    } finally {
      setIsCompleting(false);
    }
  };

  // Reschedule Execution
  const handleRescheduleSubmit = async () => {
    if (!rescheduleModalItem || !rescheduleDate) return;
    setIsRescheduling(true);
    try {
      const res = await rescheduleFollowUpQuickAction(
        rescheduleModalItem.id,
        rescheduleDate,
        rescheduleReason
      );
      if (res.success) {
        toast.success(res.message || 'Follow-up rescheduled');
        if (res.data) {
          const updated = res.data;
          const targetDate = new Date(rescheduleDate);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

          setData((d) => {
            const cleanOverdue = d.overdue.filter((f) => f.id !== updated.id);
            const cleanToday = d.today.filter((f) => f.id !== updated.id);
            const cleanUpcoming = d.upcoming.filter((f) => f.id !== updated.id);

            if (targetDate < todayStart) {
              return { ...d, overdue: [...cleanOverdue, updated], today: cleanToday, upcoming: cleanUpcoming };
            } else if (targetDate >= todayStart && targetDate <= todayEnd) {
              return { ...d, overdue: cleanOverdue, today: [...cleanToday, updated], upcoming: cleanUpcoming };
            } else {
              return { ...d, overdue: cleanOverdue, today: cleanToday, upcoming: [...cleanUpcoming, updated] };
            }
          });
        }
        setRescheduleModalItem(null);
        setRescheduleDate('');
        setRescheduleReason('');
      } else {
        toast.error(res.error || 'Failed to reschedule');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsRescheduling(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-3 h-3 text-blue-500" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-3 h-3 text-emerald-500" />;
      case 'EMAIL':
        return <Mail className="w-3 h-3 text-purple-500" />;
      case 'MEETING':
        return <Users className="w-3 h-3 text-amber-500" />;
      case 'VIDEO_CALL':
        return <Video className="w-3 h-3 text-cyan-500" />;
      default:
        return <Calendar className="w-3 h-3 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold">Urgent</Badge>;
      case 'HIGH':
        return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-500 text-white uppercase font-bold">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground uppercase">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 uppercase">Low</Badge>;
    }
  };

  // Card Component
  const renderCard = (item: FollowUpRecord, category: 'overdue' | 'today' | 'upcoming' | 'completed') => {
    const customer = item.lead?.customer;
    const customerName =
      [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() ||
      customer?.name ||
      'Valued Client';
    const phone = customer?.phone || '';
    const cleanPhone = cleanPhoneNumber(phone);
    const assignedName = item.assignedTo?.name || item.lead?.assignedTo?.name || 'Unassigned';
    const dateObj = new Date(item.followUpDate);

    const isOverdueItem = category === 'overdue' || (category !== 'completed' && isPast(dateObj));

    return (
      <div
        key={item.id}
        className={`rounded-xl border bg-card p-4 shadow-xs transition-all duration-150 hover:shadow-md space-y-3 ${
          category === 'overdue'
            ? 'border-rose-200/80 dark:border-rose-950/60 bg-gradient-to-b from-rose-50/20 to-card'
            : category === 'today'
            ? 'border-indigo-200/80 dark:border-indigo-950/60 bg-gradient-to-b from-indigo-50/20 to-card'
            : 'border-border/80'
        }`}
      >
        {/* Top: Scheduled Time & Priority Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {getTypeIcon(item.type)}
            <span className="capitalize">{item.type.toLowerCase().replace('_', ' ')}</span>
            <span className="text-muted-foreground/60">•</span>
            <span
              className={`text-[11px] font-medium ${
                isOverdueItem
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : category === 'today'
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-muted-foreground'
              }`}
            >
              {category === 'overdue'
                ? `Overdue (${format(dateObj, 'dd MMM, p')})`
                : category === 'today'
                ? `Today at ${format(dateObj, 'p')}`
                : format(dateObj, 'dd MMM, p')}
            </span>
          </div>

          {getPriorityBadge(item.priority)}
        </div>

        {/* Customer & Lead Details */}
        <div>
          <h4 className="text-sm font-bold text-foreground truncate" title={customerName}>
            {customerName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Link
              href={`/leads/${item.leadId}`}
              className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>{item.lead?.leadCode}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
              {item.lead?.status}
            </Badge>
            {item.lead?.package?.name && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {item.lead.package.name}
              </span>
            )}
          </div>
        </div>

        {/* Notes Snippet */}
        {item.notes && (
          <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">
            &quot;{item.notes}&quot;
          </div>
        )}

        {/* Executive Assignment & Contact / Actions */}
        <div className="pt-2 border-t flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[110px]" title={assignedName}>
            <UserIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{assignedName}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* WhatsApp */}
            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Hi ${customerName}, following up regarding your photography inquiry with our studio.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Chat on WhatsApp"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            ) : null}

            {/* Direct Call */}
            {phone ? (
              <a
                href={`tel:${phone}`}
                title="Call Customer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            ) : null}

            {/* Reschedule Button */}
            {category !== 'completed' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRescheduleModalItem(item);
                  setRescheduleDate(format(new Date(item.followUpDate), "yyyy-MM-dd'T'HH:mm"));
                }}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Reschedule Follow-Up"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Quick Complete Button */}
            {category !== 'completed' ? (
              <Button
                size="sm"
                onClick={() => setCompleteModalItem(item)}
                className="h-7 text-xs font-semibold px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                title="Mark as Completed"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </Button>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Value KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Pending Follow-ups</div>
            <div className="text-2xl font-black text-foreground mt-0.5">{data.stats.totalPending}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue</span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {data.stats.overdueCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Due Today</span>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {data.stats.todayCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Upcoming</div>
            <div className="text-2xl font-black text-foreground mt-0.5">{data.stats.upcomingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card border rounded-xl p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, phone, lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
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

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'ALL')}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
              <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || 'ALL')}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher */}
        <div className="inline-flex rounded-lg border bg-muted/50 p-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'board'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns3 className="w-4 h-4" />
            <span>Columns</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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

      {/* KANBAN-STYLE THREE-COLUMN DASHBOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* 1. OVERDUE COLUMN */}
          <div className="flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs border-t-4 border-t-rose-500 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b bg-card/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-xs font-bold text-foreground tracking-tight">Overdue Calls & Tasks</h3>
              </div>
              <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredOverdue.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredOverdue.length === 0 ? (
                <div className="h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center text-muted-foreground/60">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-2" />
                  <p className="text-xs font-medium text-foreground">Zero Overdue Tasks</p>
                  <p className="text-[11px] mt-0.5">All scheduled follow-ups are up to date.</p>
                </div>
              ) : (
                filteredOverdue.map((item) => renderCard(item, 'overdue'))
              )}
            </div>
          </div>

          {/* 2. TODAY COLUMN */}
          <div className="flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs border-t-4 border-t-indigo-500 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b bg-card/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-bold text-foreground tracking-tight">Scheduled for Today</h3>
              </div>
              <Badge className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredToday.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredToday.length === 0 ? (
                <div className="h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center text-muted-foreground/60">
                  <Clock className="w-8 h-8 text-indigo-500/60 mb-2" />
                  <p className="text-xs font-medium text-foreground">No Follow-ups for Today</p>
                  <p className="text-[11px] mt-0.5">Check Upcoming or schedule new follow-ups from Leads.</p>
                </div>
              ) : (
                filteredToday.map((item) => renderCard(item, 'today'))
              )}
            </div>
          </div>

          {/* 3. UPCOMING COLUMN */}
          <div className="flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs border-t-4 border-t-slate-500 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b bg-card/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <h3 className="text-xs font-bold text-foreground tracking-tight">Upcoming Pipeline</h3>
              </div>
              <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredUpcoming.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredUpcoming.length === 0 ? (
                <div className="h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center text-muted-foreground/60">
                  <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">No Upcoming Follow-ups</p>
                  <p className="text-[11px] mt-0.5">Schedule next touches from Lead detail cards.</p>
                </div>
              ) : (
                filteredUpcoming.map((item) => renderCard(item, 'upcoming'))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW (TABBED) */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Overdue Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Overdue Follow-ups ({filteredOverdue.length})
              </h3>
            </div>
            {filteredOverdue.length === 0 ? (
              <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                No overdue follow-ups.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOverdue.map((item) => renderCard(item, 'overdue'))}
              </div>
            )}
          </div>

          {/* Today Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                Scheduled for Today ({filteredToday.length})
              </h3>
            </div>
            {filteredToday.length === 0 ? (
              <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                No follow-ups due today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredToday.map((item) => renderCard(item, 'today'))}
              </div>
            )}
          </div>

          {/* Upcoming Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <h3 className="text-sm font-bold text-foreground">
                Upcoming Follow-ups ({filteredUpcoming.length})
              </h3>
            </div>
            {filteredUpcoming.length === 0 ? (
              <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                No upcoming follow-ups.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUpcoming.map((item) => renderCard(item, 'upcoming'))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK COMPLETE MODAL */}
      {completeModalItem && (
        <Dialog open={!!completeModalItem} onOpenChange={() => setCompleteModalItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Complete Follow-up</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log the call or interaction outcome for {completeModalItem.lead?.customer?.firstName || 'Client'} ({completeModalItem.lead?.leadCode}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Interaction Outcome</label>
                <Select value={completeOutcome} onValueChange={(val) => setCompleteOutcome(val || 'INTERESTED')}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERESTED">Interested / Proceeding</SelectItem>
                    <SelectItem value="CALLBACK_REQUESTED">Callback Requested</SelectItem>
                    <SelectItem value="MET">Client Met / Meeting Done</SelectItem>
                    <SelectItem value="NO_ANSWER">No Answer / Did Not Pick Up</SelectItem>
                    <SelectItem value="NOT_INTERESTED">Not Interested / Dropped</SelectItem>
                    <SelectItem value="OTHER">Other / General Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Discussion Notes & Next Steps</label>
                <Textarea
                  rows={3}
                  placeholder="e.g., Client requested quotation revision with drone addon..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCompleteModalItem(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isCompleting}
                onClick={() => handleQuickComplete(completeModalItem, completeOutcome, completeNotes)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {isCompleting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Mark Completed</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleModalItem && (
        <Dialog open={!!rescheduleModalItem} onOpenChange={() => setRescheduleModalItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span>Reschedule Follow-up</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pick a new date and time for {rescheduleModalItem.lead?.customer?.firstName || 'Client'} ({rescheduleModalItem.lead?.leadCode}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">New Date & Time</label>
                <Input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Reason for Rescheduling</label>
                <Input
                  placeholder="e.g., Client travelling, requested callback on Monday..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRescheduleModalItem(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isRescheduling || !rescheduleDate}
                onClick={handleRescheduleSubmit}
                className="font-semibold gap-1.5"
              >
                {isRescheduling ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                <span>Confirm Reschedule</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
