'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import {
  Film,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanColumn, KanbanColumnDefinition } from './kanban-column';
import { KanbanCardTask } from './kanban-card';
import { VideoTaskModal } from './video-task-modal';
import { updateVideoTaskStatusAction } from '@/actions/video-editing.actions';
import { TaskStatus } from '@prisma/client';

export const KANBAN_COLUMNS: KanbanColumnDefinition[] = [
  {
    id: TaskStatus.TODO,
    title: 'To Do / Queue',
    subtitle: 'Assigned cuts awaiting initial edit',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    headerBorder: 'border-t-slate-400',
  },
  {
    id: TaskStatus.IN_PROGRESS,
    title: 'In Progress / Cutting',
    subtitle: 'Rough cut, sound sync & color grade',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    headerBorder: 'border-t-blue-500',
  },
  {
    id: TaskStatus.CLIENT_REVIEW,
    title: 'Client Review',
    subtitle: 'Draft stream preview submitted to client',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    headerBorder: 'border-t-amber-500',
  },
  {
    id: TaskStatus.CHANGES_REQUESTED,
    title: 'Changes Requested',
    subtitle: 'Client feedback & revision cycle in progress',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    headerBorder: 'border-t-rose-500',
  },
  {
    id: TaskStatus.APPROVED,
    title: 'Approved / Final Cut',
    subtitle: 'Client signed-off, master HD rendered',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    headerBorder: 'border-t-emerald-500',
  },
];

interface VideoKanbanBoardProps {
  initialTasks: KanbanCardTask[];
  editors: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    designation: string | null;
    employmentType: string | null;
  }>;
  activeBookings: Array<{
    id: string;
    bookingNumber: string | null;
    title: string | null;
    startDate: string | Date | null;
  }>;
}

/**
 * Normalizes task status into one of the 5 canonical Kanban columns.
 */
function normalizeStatusToColumn(status: TaskStatus): TaskStatus {
  switch (status) {
    case TaskStatus.PENDING:
    case TaskStatus.TODO:
      return TaskStatus.TODO;
    case TaskStatus.IN_PROGRESS:
      return TaskStatus.IN_PROGRESS;
    case TaskStatus.REVIEW:
    case TaskStatus.IN_REVIEW:
    case TaskStatus.CLIENT_REVIEW:
      return TaskStatus.CLIENT_REVIEW;
    case TaskStatus.CHANGES_REQUESTED:
      return TaskStatus.CHANGES_REQUESTED;
    case TaskStatus.APPROVED:
    case TaskStatus.COMPLETED:
      return TaskStatus.APPROVED;
    default:
      return TaskStatus.TODO;
  }
}

export function VideoKanbanBoard({
  initialTasks,
  editors,
  activeBookings,
}: VideoKanbanBoardProps) {
  // Avoid SSR hydration issues with drag-and-drop
  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState<KanbanCardTask[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEditorFilter, setSelectedEditorFilter] = useState('ALL');
  const [selectedBookingFilter, setSelectedBookingFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<KanbanCardTask | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update tasks when props change
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Filter tasks based on search, editor, and booking filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (t.taskType || t.type).toLowerCase().includes(q);
      const bookingMatch =
        (t.eventBooking?.title || '').toLowerCase().includes(q) ||
        (t.eventBooking?.bookingNumber || '').toLowerCase().includes(q);
      const editorMatch = (t.user?.name || '').toLowerCase().includes(q);

      if (q && !titleMatch && !bookingMatch && !editorMatch) {
        return false;
      }

      if (selectedEditorFilter !== 'ALL') {
        if (selectedEditorFilter === 'UNASSIGNED' && t.assignedTo) return false;
        if (selectedEditorFilter === 'FREELANCE' && t.user?.employmentType !== 'FREELANCE' && !t.editorToken) return false;
        if (selectedEditorFilter === 'IN_HOUSE' && (t.user?.employmentType === 'FREELANCE' || !t.assignedTo)) return false;
        if (selectedEditorFilter !== 'UNASSIGNED' && selectedEditorFilter !== 'FREELANCE' && selectedEditorFilter !== 'IN_HOUSE') {
          if (t.assignedTo !== selectedEditorFilter) return false;
        }
      }

      if (selectedBookingFilter !== 'ALL') {
        if (t.eventBooking?.id !== selectedBookingFilter) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedEditorFilter, selectedBookingFilter]);

  // Group tasks by canonical Kanban columns
  const columnTasksMap = useMemo(() => {
    const map: Record<string, KanbanCardTask[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.CLIENT_REVIEW]: [],
      [TaskStatus.CHANGES_REQUESTED]: [],
      [TaskStatus.APPROVED]: [],
    };

    filteredTasks.forEach((task) => {
      const colId = normalizeStatusToColumn(task.status);
      if (map[colId]) {
        map[colId].push(task);
      } else {
        map[TaskStatus.TODO].push(task);
      }
    });

    return map;
  }, [filteredTasks]);

  // Handle Drag & Drop End Event
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const targetColumnStatus = destination.droppableId as TaskStatus;
    const taskToMove = tasks.find((t) => t.id === draggableId);

    if (!taskToMove) return;

    // Snapshot previous state for rollback
    const previousTasks = [...tasks];

    // Optimistic UI update
    const updatedTasks = tasks.map((t) => {
      if (t.id === draggableId) {
        return {
          ...t,
          status: targetColumnStatus,
          revisionsCount:
            targetColumnStatus === TaskStatus.CHANGES_REQUESTED
              ? t.revisionsCount + 1
              : t.revisionsCount,
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    const columnTitle =
      KANBAN_COLUMNS.find((c) => c.id === targetColumnStatus)?.title || targetColumnStatus;

    try {
      const res = await updateVideoTaskStatusAction({
        taskId: draggableId,
        status: targetColumnStatus,
        incrementRevisions: targetColumnStatus === TaskStatus.CHANGES_REQUESTED,
      });

      if (res.success) {
        toast.success(`Moved "${taskToMove.taskType || 'Cut'}" to ${columnTitle}!`);
      } else {
        toast.error(res.error || 'Failed to update task status.');
        setTasks(previousTasks); // Rollback
      }
    } catch (err: any) {
      console.error('Error persisting drag status:', err);
      toast.error('Network error updating task status.');
      setTasks(previousTasks); // Rollback
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedTaskForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: KanbanCardTask) => {
    setSelectedTaskForEdit(task);
    setIsModalOpen(true);
  };

  const handleQuickWhatsApp = (task: KanbanCardTask) => {
    setSelectedTaskForEdit(task);
    setIsModalOpen(true);
  };

  // Metrics for Top Summary Bar
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      clientReview: tasks.filter(
        (t) => t.status === TaskStatus.CLIENT_REVIEW || t.status === TaskStatus.REVIEW || t.status === TaskStatus.IN_REVIEW
      ).length,
      changesRequested: tasks.filter((t) => t.status === TaskStatus.CHANGES_REQUESTED).length,
      approved: tasks.filter((t) => t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED).length,
    };
  }, [tasks]);

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/40 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 bg-muted/30 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar & Metrics */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Film className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Video Editor Workbench
            </h2>
            <Badge variant="outline" className="font-mono text-xs font-semibold px-2">
              {stats.total} Deliverables
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage teasers, highlights, and full traditional cuts with external Magic Links and client approval tracking.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>In Cut: <strong>{stats.inProgress}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
            <Film className="h-3.5 w-3.5" />
            <span>In Review: <strong>{stats.clientReview}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Revisions: <strong>{stats.changesRequested}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Approved: <strong>{stats.approved}</strong></span>
          </div>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Video Cut</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search deliverable cuts, project bookings, or assigned editors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Select value={selectedEditorFilter} onValueChange={(val) => setSelectedEditorFilter(val || 'ALL')}>
            <SelectTrigger className="w-[170px] text-xs h-9 bg-card">
              <SelectValue placeholder="Filter by Editor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Editors</SelectItem>
              <SelectItem value="IN_HOUSE" className="text-xs">In-House Staff</SelectItem>
              <SelectItem value="FREELANCE" className="text-xs">Freelancers (External)</SelectItem>
              <SelectItem value="UNASSIGNED" className="text-xs">Unassigned</SelectItem>
              {editors.map((ed) => (
                <SelectItem key={ed.id} value={ed.id} className="text-xs">
                  {ed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBookingFilter} onValueChange={(val) => setSelectedBookingFilter(val || 'ALL')}>
            <SelectTrigger className="w-[180px] text-xs h-9 bg-card">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Projects</SelectItem>
              {activeBookings.slice(0, 20).map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || selectedEditorFilter !== 'ALL' || selectedBookingFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedEditorFilter('ALL');
                setSelectedBookingFilter('ALL');
              }}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Responsive Drag and Drop Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[550px] scrollbar-thin">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={columnTasksMap[col.id] || []}
              onEditTask={handleOpenEditModal}
              onQuickWhatsApp={handleQuickWhatsApp}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Video Task Modal (Create & Edit) */}
      <VideoTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTaskForEdit}
        editors={editors}
        activeBookings={activeBookings}
        onSuccess={() => {
          // Re-fetch or keep current state; in Next.js Server Actions revalidatePath updates server component
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
