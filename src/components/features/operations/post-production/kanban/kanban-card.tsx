'use client';

import * as React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatDate } from '@/lib/date';
import {
  Film,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  HardDrive,
  Eye,
  CheckCircle2,
  KeyRound,
  Edit,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TaskStatus } from '@prisma/client';

export interface KanbanCardTask {
  id: string;
  tenantId: string;
  type: string;
  taskType: string | null;
  status: TaskStatus;
  dueDate: string | Date | null;
  notes: string | null;
  assignedTo: string | null;
  assetsUrl: string | null;
  previewUrl: string | null;
  deliveryUrl: string | null;
  directorNotes: string | null;
  clientFeedback: string | null;
  referenceLinks: string[];
  revisionsCount: number;
  editorToken: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    designation: string | null;
    employmentType: string | null;
  } | null;
  eventBooking?: {
    id: string;
    bookingNumber: string | null;
    title: string | null;
    startDate: string | Date | null;
    location?: string | null;
    customer?: {
      id?: string;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    } | null;
    dataIngestionJobs?: Array<{
      id: string;
      status: string;
      primaryStoragePath: string | null;
      totalSizeGb: number | null;
    }>;
  } | null;
}

interface KanbanCardProps {
  task: KanbanCardTask;
  index: number;
  onEdit: (task: KanbanCardTask) => void;
  onQuickWhatsApp: (task: KanbanCardTask) => void;
}

export function KanbanCard({ task, index, onEdit, onQuickWhatsApp }: KanbanCardProps) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== TaskStatus.APPROVED &&
    task.status !== TaskStatus.COMPLETED;

  const isFreelance = task.user?.employmentType === 'FREELANCE' || (!task.assignedTo && task.editorToken);
  const deliverableTitle = task.taskType || task.type.replace(/_/g, ' ');

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3 select-none"
        >
          <Card
            className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border ${
              snapshot.isDragging
                ? 'shadow-2xl ring-2 ring-primary ring-offset-2 bg-card scale-[1.02] rotate-1 z-50'
                : 'bg-card/90 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {/* Top Accent Strip */}
            <div
              className={`h-1 w-full ${
                task.status === TaskStatus.CHANGES_REQUESTED
                  ? 'bg-rose-500'
                  : task.status === TaskStatus.CLIENT_REVIEW
                  ? 'bg-amber-500'
                  : task.status === TaskStatus.APPROVED
                  ? 'bg-emerald-500'
                  : task.status === TaskStatus.IN_PROGRESS
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
              }`}
            />

            <CardContent className="p-3.5 space-y-3">
              {/* Header: Title & Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {deliverableTitle}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider font-mono">
                      {task.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Project / Booking association */}
                  {task.eventBooking && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1 font-medium">
                      <Film className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{task.eventBooking.title}</span>
                      {task.eventBooking.bookingNumber && (
                        <span className="font-mono text-[10px] text-muted-foreground/80 shrink-0">
                          ({task.eventBooking.bookingNumber})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Revision Badge (if revisions > 0) */}
                {task.revisionsCount > 0 && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] px-1.5 py-0 font-bold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 animate-pulse flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Rev #{task.revisionsCount}
                  </Badge>
                )}
              </div>

              {/* Client Feedback Banner (if in Changes Requested stage) */}
              {task.status === TaskStatus.CHANGES_REQUESTED && task.clientFeedback && (
                <div className="rounded-md bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 p-2 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-[11px]">
                    <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Client Revision Notes:</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed italic">
                    &ldquo;{task.clientFeedback}&rdquo;
                  </p>
                </div>
              )}

              {/* Editor Assignment Pill */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      task.user
                        ? isFreelance
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {task.user?.name ? task.user.name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                  </div>

                  <div className="truncate">
                    {task.user?.name ? (
                      <span className="font-medium text-foreground truncate block text-xs">
                        {task.user.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Unassigned</span>
                    )}
                  </div>

                  {isFreelance && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0">
                      Freelancer
                    </Badge>
                  )}
                </div>

                {/* Target Due Date */}
                <div
                  className={`flex items-center gap-1 text-[11px] shrink-0 font-medium ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-muted-foreground'
                  }`}
                  title={task.dueDate ? `Target Due: ${formatDate(task.dueDate, 'dd MMMM yyyy')}` : 'No due date'}
                >
                  <Clock className="h-3 w-3" />
                  <span>{task.dueDate ? formatDate(task.dueDate, 'dd MMM') : 'No Date'}</span>
                </div>
              </div>

              {/* Vault & Media Indicators */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {task.assetsUrl && (
                  <a
                    href={task.assetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:underline"
                    title="RAW Footage Link (Confidential - Editors Only)"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HardDrive className="h-2.5 w-2.5" />
                    <span>RAW Vault</span>
                  </a>
                )}

                {task.previewUrl && (
                  <a
                    href={task.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900 hover:underline"
                    title="Draft Render Preview Link (Surfaced in Client Portal)"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-2.5 w-2.5" />
                    <span>Review Cut</span>
                  </a>
                )}

                {task.deliveryUrl && (
                  <a
                    href={task.deliveryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:underline"
                    title="Master HD Download Link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span>Master HD</span>
                  </a>
                )}

                {task.editorToken && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                    title="Secure Magic Link active for external freelancer submission"
                  >
                    <KeyRound className="h-2.5 w-2.5" />
                    <span>Magic Link</span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => onQuickWhatsApp(task)}
                  title="Generate & Send WhatsApp Creative Brief"
                >
                  <MessageSquare className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] font-medium hover:bg-primary hover:text-primary-foreground"
                  onClick={() => onEdit(task)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  <span>Edit / Assign</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
