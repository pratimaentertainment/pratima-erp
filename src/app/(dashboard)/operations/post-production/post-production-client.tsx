'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  Film,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  User,
  HardDrive,
  Link as LinkIcon,
  AlertCircle,
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Eye,
  CheckSquare,
  UploadCloud,
  FileCheck,
  Send,
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
  initializePostProductionJobAction,
  assignDeliverableTaskAction,
  updateTaskStatusAction,
  updateJobStatusAction,
} from '@/actions/post-production.actions';
import { PostProductionStatus, TaskStatus } from '@prisma/client';

const STATUS_COLUMNS: { key: PostProductionStatus; label: string; color: string; bg: string; border: string }[] = [
  {
    key: PostProductionStatus.PENDING,
    label: 'Pending Ingest',
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
  },
  {
    key: PostProductionStatus.DATA_DUMPED,
    label: 'Data Ingested',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    key: PostProductionStatus.CLIENT_SELECTION,
    label: 'Client Selection',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    key: PostProductionStatus.EDITING,
    label: 'Editing In Progress',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    key: PostProductionStatus.REVIEW,
    label: 'Internal Review',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  {
    key: PostProductionStatus.DELIVERED,
    label: 'Ready / Delivered',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
];

const TASK_PRESETS = [
  'TEASER_60S',
  'CINEMATIC_HIGHLIGHTS',
  'FULL_TRADITIONAL_FILM',
  'PHOTO_ALBUM_DESIGN',
  'RAW_SELECTION_CURATION',
  'RETOUCHING_MASTER_PORTRAITS',
  'DRONE_AERIAL_REEL',
  'AUDIO_MIX_MASTER',
];

export interface PostProductionEditor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  skills?: string[];
  employmentType?: string | null;
}

export interface PostProductionWorkflowTask {
  id: string;
  jobId?: string | null;
  taskType?: string | null;
  title?: string | null;
  type?: string | null;
  status: TaskStatus;
  dueDate?: string | Date | null;
  notes?: string | null;
  assignedTo?: string | null;
  assignedEditorId?: string | null;
  user?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
  } | null;
  assignedEditor?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
  } | null;
}

export interface PostProductionJobItem {
  id: string;
  bookingId: string;
  status: PostProductionStatus;
  cloudFolderLink?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  booking?: {
    id: string;
    bookingNumber: string;
    title: string;
    startDate: string | Date;
    endDate?: string | Date | null;
    customer?: {
      id: string;
      customerCode?: string | null;
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
      portalAccessCode?: string | null;
    } | null;
    assignments?: Array<{
      user?: {
        id: string;
        name: string;
        designation?: string | null;
        phone?: string | null;
      } | null;
    }>;
  } | null;
  workflowTasks?: PostProductionWorkflowTask[];
  deliverableTasks?: PostProductionWorkflowTask[];
  clientSelection?: {
    id: string;
    status: string;
    selectedPhotoNames?: string | null;
    submittedAt?: string | Date | null;
    instructions?: string | null;
  } | null;
}

export interface UninitializedBookingItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: string | Date;
  customer?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface PostProductionClientProps {
  initialJobs: PostProductionJobItem[];
  uninitializedBookings: UninitializedBookingItem[];
  editors: PostProductionEditor[];
}

export function PostProductionClient({
  initialJobs = [],
  uninitializedBookings = [],
  editors = [],
}: PostProductionClientProps) {
  const [jobs, setJobs] = useState<PostProductionJobItem[]>(initialJobs);
  const [uninitialized, setUninitialized] = useState<UninitializedBookingItem[]>(uninitializedBookings);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorFilter, setEditorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isPending, startTransition] = useTransition();

  // Task Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedJobForTask, setSelectedJobForTask] = useState<PostProductionJobItem | null>(null);
  const [taskType, setTaskType] = useState('');
  const [assignedEditorId, setAssignedEditorId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Status & Cloud Link Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedJobForStatus, setSelectedJobForStatus] = useState<PostProductionJobItem | null>(null);
  const [newStatus, setNewStatus] = useState<PostProductionStatus>(PostProductionStatus.PENDING);
  const [cloudFolderLink, setCloudFolderLink] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Selection Detail Modal State
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [activeSelectionData, setActiveSelectionData] = useState<{
    jobTitle?: string;
    bookingNumber?: string;
    clientName?: string;
    selection?: {
      id?: string;
      status?: string;
      selectedPhotoNames?: string | null;
      submittedAt?: string | Date | null;
      instructions?: string | null;
    } | null;
  } | null>(null);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.booking?.title?.toLowerCase().includes(q) ||
        job.booking?.bookingNumber?.toLowerCase().includes(q) ||
        `${job.booking?.customer?.firstName || ''} ${job.booking?.customer?.lastName || ''}`.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;

      const matchesEditor =
        editorFilter === 'ALL' ||
        job.workflowTasks?.some((t: PostProductionWorkflowTask) => (t.assignedTo || t.assignedEditorId) === editorFilter) ||
        job.deliverableTasks?.some((t: PostProductionWorkflowTask) => (t.assignedTo || t.assignedEditorId) === editorFilter);

      return matchesSearch && matchesStatus && matchesEditor;
    });
  }, [jobs, searchQuery, statusFilter, editorFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of STATUS_COLUMNS) {
      counts[col.key] = jobs.filter((j) => j.status === col.key).length;
    }
    return counts;
  }, [jobs]);

  // Handle 1-click initialize
  const handleInitializeJob = async (bookingId: string) => {
    startTransition(async () => {
      try {
        const res = await initializePostProductionJobAction({ bookingId });
        if (!res.success || !res.data) {
          toast.error(res.error || 'Failed to initialize job');
          return;
        }

        toast.success('Post-production editing pipeline initialized!');
        setJobs((prev) => [res.data as PostProductionJobItem, ...prev]);
        setUninitialized((prev) => prev.filter((b) => b.id !== bookingId));
      } catch (err: unknown) {
        toast.error((err as Error).message || 'An error occurred');
      }
    });
  };

  // Open Task Modal
  const handleOpenTaskModal = (job: PostProductionJobItem) => {
    setSelectedJobForTask(job);
    setTaskType('');
    setAssignedEditorId('');
    setDueDate('');
    setTaskNotes('');
    setTaskModalOpen(true);
  };

  // Submit Task
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForTask || !taskType.trim()) {
      toast.error('Task type is required');
      return;
    }

    setIsCreatingTask(true);
    try {
      const res = await assignDeliverableTaskAction({
        jobId: selectedJobForTask.id,
        taskType: taskType.trim(),
        assignedEditorId: assignedEditorId ? assignedEditorId : null,
        dueDate: dueDate ? dueDate : null,
        notes: taskNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to assign deliverable task');
        return;
      }

      // Update local state
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== selectedJobForTask.id) return j;
          const currentTasks = j.workflowTasks || j.deliverableTasks || [];
          return {
            ...j,
            workflowTasks: [...currentTasks, res.data as PostProductionWorkflowTask],
            deliverableTasks: [...currentTasks, res.data as PostProductionWorkflowTask],
          };
        })
      );

      toast.success(`Task "${taskType}" assigned successfully!`);
      setTaskModalOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Open Status Modal
  const handleOpenStatusModal = (job: PostProductionJobItem) => {
    setSelectedJobForStatus(job);
    setNewStatus(job.status);
    setCloudFolderLink(job.cloudFolderLink || '');
    setStatusNotes(job.notes || '');
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleSubmitStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await updateJobStatusAction({
        jobId: selectedJobForStatus.id,
        status: newStatus,
        cloudFolderLink: cloudFolderLink.trim() || null,
        notes: statusNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to update job status');
        return;
      }

      setJobs((prev) =>
        prev.map((j) => (j.id === selectedJobForStatus.id ? (res.data as PostProductionJobItem) : j))
      );

      toast.success(`Pipeline advanced to "${newStatus}"!`);
      setStatusModalOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Update Individual Task Status Quick Switch
  const handleQuickTaskStatus = async (taskId: string, currentJobId: string, status: TaskStatus) => {
    try {
      const res = await updateTaskStatusAction({
        taskId,
        status,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to update task');
        return;
      }

      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== currentJobId) return j;
          const tasks = (j.workflowTasks || j.deliverableTasks || []).map((t: PostProductionWorkflowTask) =>
            t.id === taskId ? (res.data as PostProductionWorkflowTask) : t
          );
          return { ...j, workflowTasks: tasks, deliverableTasks: tasks };
        })
      );

      toast.success(`Task marked as ${status}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error updating task status');
    }
  };

  // View Selection Modal
  const handleOpenSelectionModal = (job: PostProductionJobItem) => {
    setActiveSelectionData({
      jobTitle: job.booking?.title,
      bookingNumber: job.booking?.bookingNumber,
      clientName: `${job.booking?.customer?.firstName || ''} ${job.booking?.customer?.lastName || ''}`,
      selection: job.clientSelection,
    });
    setSelectionModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Post-Production & Editing Workflow</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Step 7 Pipeline
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Track card ingests, allocate deliverables to editors, review client photo selections, and publish cloud delivery vaults.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1 bg-muted/40">
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="h-7 px-2.5 text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Kanban Board
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2.5 text-xs"
            >
              <List className="h-3.5 w-3.5 mr-1" />
              List View
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {STATUS_COLUMNS.map((col) => (
          <Card key={col.key} className="border-border/60 shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground truncate">{col.label}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${col.bg} ${col.color}`}>
                  {statusCounts[col.key] || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ready for Post-Production Alert Bar (Uninitialized Events) */}
      {uninitialized.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {uninitialized.length} Event{uninitialized.length === 1 ? '' : 's'} Ready for Post-Production
                </span>
                <p className="text-xs text-muted-foreground">
                  Events wrapped or confirmed that need data dump and editor workflow initialization.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {uninitialized.slice(0, 3).map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleInitializeJob(b.id)}
                  disabled={isPending}
                  className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Start {b.bookingNumber}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search event, client name, booking code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={editorFilter} onValueChange={(val) => setEditorFilter(val || 'ALL')}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Editors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Editors</SelectItem>
              {editors.map((ed) => (
                <SelectItem key={ed.id} value={ed.id}>
                  {ed.name} ({ed.designation || 'Editor'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stages</SelectItem>
              {STATUS_COLUMNS.map((col) => (
                <SelectItem key={col.key} value={col.key}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground text-right">
          Showing {filteredJobs.length} active editing job{filteredJobs.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* VIEW MODE 1: KANBAN BOARD */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((j) => j.status === col.key);

            return (
              <div
                key={col.key}
                className="rounded-xl border bg-card/60 p-3 space-y-3 min-w-[280px] xl:min-w-0 flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.bg} ring-2 ${col.border}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {col.label}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-bold">
                    {colJobs.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <div className="space-y-3 flex-1">
                  {colJobs.length === 0 ? (
                    <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      No jobs in this stage
                    </div>
                  ) : (
                    colJobs.map((job) => {
                      const tasks = job.workflowTasks || job.deliverableTasks || [];
                      const completedTasks = tasks.filter((t: PostProductionWorkflowTask) => t.status === TaskStatus.COMPLETED).length;
                      const hasSelection = Boolean(job.clientSelection?.submittedAt);
                      const photoCount = job.clientSelection?.selectedPhotoNames
                        ? job.clientSelection.selectedPhotoNames.split(',').filter(Boolean).length
                        : 0;

                      return (
                        <Card
                          key={job.id}
                          className="border-border/80 shadow-xs hover:border-primary/50 transition-all bg-card"
                        >
                          <CardHeader className="p-3 pb-2 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                {job.booking?.bookingNumber}
                              </span>

                              {job.cloudFolderLink && (
                                <a
                                  href={job.cloudFolderLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open Cloud Delivery Vault"
                                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5 rounded-md hover:bg-emerald-500/10"
                                >
                                  <HardDrive className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            <CardTitle className="text-xs font-bold leading-tight line-clamp-2">
                              {job.booking?.title}
                            </CardTitle>
                            <CardDescription className="text-[11px] truncate">
                              {job.booking?.customer?.firstName} {job.booking?.customer?.lastName}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="p-3 pt-0 space-y-2.5 text-xs">
                            {/* Deliverables Progress */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="h-3 w-3 text-primary" />
                                  Tasks: {completedTasks}/{tasks.length}
                                </span>
                                <span className="font-semibold">
                                  {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{
                                    width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Client Photo Selection Status */}
                            {hasSelection ? (
                              <div
                                onClick={() => handleOpenSelectionModal(job)}
                                className="flex items-center justify-between p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-500/15 transition-colors text-[11px]"
                              >
                                <span className="flex items-center gap-1">
                                  <FileCheck className="h-3 w-3" />
                                  {photoCount} Photos Selected
                                </span>
                                <Eye className="h-3 w-3" />
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Selection: Pending client submission</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t flex items-center justify-between gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenTaskModal(job)}
                                className="h-6 px-2 text-[10px]"
                              >
                                <Plus className="h-3 w-3 mr-0.5" />
                                Task
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusModal(job)}
                                className="h-6 px-2 text-[10px]"
                              >
                                <SlidersHorizontal className="h-3 w-3 mr-0.5" />
                                Stage
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE 2: DETAILED TABLE / LIST VIEW */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event & Booking</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Deliverable Tasks</TableHead>
                <TableHead>Client Selection</TableHead>
                <TableHead>Cloud Vault</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No post-production editing jobs found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => {
                  const tasks = job.workflowTasks || job.deliverableTasks || [];
                  const completedTasks = tasks.filter((t: PostProductionWorkflowTask) => t.status === TaskStatus.COMPLETED).length;
                  const hasSelection = Boolean(job.clientSelection?.submittedAt);
                  const photoCount = job.clientSelection?.selectedPhotoNames
                    ? job.clientSelection.selectedPhotoNames.split(',').filter(Boolean).length
                    : 0;

                  return (
                    <TableRow key={job.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">{job.booking?.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{job.booking?.bookingNumber}</span>
                          <span>•</span>
                          <span>
                            {job.booking?.customer?.firstName} {job.booking?.customer?.lastName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={
                            job.status === PostProductionStatus.DELIVERED
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : job.status === PostProductionStatus.EDITING
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : job.status === PostProductionStatus.CLIENT_SELECTION
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                          }
                        >
                          {job.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 max-w-[200px]">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {completedTasks}/{tasks.length} Completed
                            </span>
                            <span>{tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {hasSelection ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSelectionModal(job)}
                            className="h-7 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                          >
                            <FileCheck className="h-3.5 w-3.5 mr-1" />
                            {photoCount} Photos Submitted
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Pending Client Choice
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {job.cloudFolderLink ? (
                          <a
                            href={job.cloudFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <HardDrive className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Vault Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTaskModal(job)}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Task
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenStatusModal(job)}
                            className="h-7 text-xs"
                          >
                            <SlidersHorizontal className="h-3 w-3 mr-1" />
                            Update Stage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* MODAL 1: ASSIGN DELIVERABLE TASK */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitTask}>
            <DialogHeader>
              <DialogTitle>Assign Editing Deliverable</DialogTitle>
              <DialogDescription>
                Assign specific post-production work for &quot;{selectedJobForTask?.booking?.title}&quot; ({selectedJobForTask?.booking?.bookingNumber}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Task Type */}
              <div className="space-y-1.5">
                <Label htmlFor="task-type">Deliverable Type *</Label>
                <Select value={taskType} onValueChange={(val) => setTaskType(val || '')}>
                  <SelectTrigger id="task-type">
                    <SelectValue placeholder="Select or type deliverable..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRESETS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Editor Assignment */}
              <div className="space-y-1.5">
                <Label htmlFor="editor-id">Assigned Editor</Label>
                <Select value={assignedEditorId} onValueChange={(val) => setAssignedEditorId(val || '')}>
                  <SelectTrigger id="editor-id">
                    <SelectValue placeholder="Select staff editor (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {editors.map((ed) => (
                      <SelectItem key={ed.id} value={ed.id}>
                        {ed.name} ({ed.designation || 'Editor'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="due-date">Target Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="task-notes">Creative Notes / Color Palette Guidelines</Label>
                <Textarea
                  id="task-notes"
                  rows={3}
                  placeholder="e.g. Warm pastel grade, 4K export, include bride and groom emotional speeches."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskModalOpen(false)}
                disabled={isCreatingTask}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingTask}>
                {isCreatingTask ? 'Assigning...' : 'Assign Deliverable'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: UPDATE STAGE & CLOUD STORAGE VAULT LINK */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitStatusChange}>
            <DialogHeader>
              <DialogTitle>Update Stage & Cloud Storage Vault</DialogTitle>
              <DialogDescription>
                Synchronize post-production status and publish final client download links for &quot;{selectedJobForStatus?.booking?.title}&quot;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Pipeline Stage */}
              <div className="space-y-1.5">
                <Label htmlFor="job-stage">Post-Production Stage *</Label>
                <Select
                  value={newStatus}
                  onValueChange={(val) => {
                    if (val) setNewStatus(val as PostProductionStatus);
                  }}
                >
                  <SelectTrigger id="job-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Updating this stage automatically syncs the client journey tracker in real time.
                </p>
              </div>

              {/* Cloud Delivery Link */}
              <div className="space-y-1.5">
                <Label htmlFor="cloud-link">Google Drive / Cloud Delivery Link</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cloud-link"
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={cloudFolderLink}
                    onChange={(e) => setCloudFolderLink(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Direct master link displayed on client portal once deliverables are ready.
                </p>
              </div>

              {/* Status Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="status-notes">Internal Production Log</Label>
                <Textarea
                  id="status-notes"
                  rows={2}
                  placeholder="e.g. Card 1 and Card 2 verified with checksum MD5. Sent proxy link to lead editor."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              {/* Deliverable Tasks Quick Overview */}
              {((selectedJobForStatus?.workflowTasks || selectedJobForStatus?.deliverableTasks) || []).length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Deliverable Tasks ({((selectedJobForStatus?.workflowTasks || selectedJobForStatus?.deliverableTasks) || []).length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(selectedJobForStatus?.workflowTasks || selectedJobForStatus?.deliverableTasks || []).map((task: PostProductionWorkflowTask) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-md border text-xs bg-muted/20"
                      >
                        <div>
                          <div className="font-medium text-foreground">{(task.taskType || task.title || '').replace(/_/g, ' ')}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {task.user?.name || task.assignedEditor?.name || 'Unassigned'}
                          </div>
                        </div>

                        <Select
                          value={task.status}
                          onValueChange={(val) => {
                            if (val && selectedJobForStatus) handleQuickTaskStatus(task.id, selectedJobForStatus.id, val as TaskStatus);
                          }}
                        >
                          <SelectTrigger className="h-6 w-28 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(TaskStatus).map((st) => (
                              <SelectItem key={st} value={st}>
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusModalOpen(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'Saving...' : 'Update Pipeline Stage'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VIEW CLIENT PHOTO SELECTION */}
      <Dialog open={selectionModalOpen} onOpenChange={setSelectionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Photo Selections</DialogTitle>
            <DialogDescription>
              {activeSelectionData?.jobTitle} ({activeSelectionData?.bookingNumber}) • Submitted by {activeSelectionData?.clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-xs text-muted-foreground">Submitted Timestamp</span>
                <div className="text-sm font-semibold text-foreground">
                  {formatDate(activeSelectionData?.selection?.submittedAt, 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                {activeSelectionData?.selection?.selectedPhotoNames
                  ? activeSelectionData.selection.selectedPhotoNames.split(',').filter(Boolean).length
                  : 0}{' '}
                Photos
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Selected File Names / Numbers
              </Label>
              <div className="p-3 rounded-lg border bg-card max-h-48 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {activeSelectionData?.selection?.selectedPhotoNames || 'No filenames provided.'}
              </div>
            </div>

            {activeSelectionData?.selection?.instructions && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Client Notes</Label>
                <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                  {activeSelectionData.selection.instructions}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (activeSelectionData?.selection?.selectedPhotoNames) {
                  navigator.clipboard.writeText(activeSelectionData.selection.selectedPhotoNames);
                  toast.success('Photo list copied to clipboard!');
                }
              }}
              variant="outline"
            >
              Copy Photo List
            </Button>
            <Button type="button" onClick={() => setSelectionModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
