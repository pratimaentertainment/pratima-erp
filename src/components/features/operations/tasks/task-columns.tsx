'use client';

import { ColumnDef } from '@tanstack/react-table';
import { WorkflowTask, TaskStatus, WorkflowType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

import { MoreHorizontal, CalendarIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { deleteTaskAction, updateTaskStatusAction } from '@/actions/task.actions';
import { toast } from 'sonner';
import { useState } from 'react';

// Extend the type to include relations
export type TaskWithRelations = WorkflowTask & {
  project?: { id: string; title: string };
  user?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
};

export function TaskActionCell({ task }: { task: TaskWithRelations }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setIsDeleting(true);
    const res = await deleteTaskAction(task.id);
    setIsDeleting(false);
    if (res.success) {
      toast.success('Task deleted successfully');
    } else {
      toast.error(res.error || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    setIsUpdatingStatus(true);
    const res = await updateTaskStatusAction(task.id, { status });
    setIsUpdatingStatus(false);
    if (res.success) {
      toast.success('Status updated successfully');
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        {/* We can open an edit modal here in a real implementation */}
        <DropdownMenuItem onClick={() => alert('Edit task functionality would open here')}>
          Edit Task
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.PENDING)} disabled={isUpdatingStatus}>
          Mark Pending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)} disabled={isUpdatingStatus}>
          Mark In Progress
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.REVIEW)} disabled={isUpdatingStatus}>
          Mark Review
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.COMPLETED)} disabled={isUpdatingStatus}>
          Mark Completed
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={isDeleting}
          className="text-red-600 focus:text-red-600"
        >
          Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<TaskWithRelations>[] = [
  {
    accessorKey: 'type',
    header: 'Task Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      return <div className="font-medium">{type.replace('_', ' ')}</div>;
    },
  },
  {
    accessorKey: 'project.title',
    header: 'Project',
    cell: ({ row }) => {
      return row.original.project ? row.original.project.title : 'N/A';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as TaskStatus;
      
      const statusColors: Record<TaskStatus, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        READY: 'bg-indigo-100 text-indigo-800',
        TODO: 'bg-slate-100 text-slate-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        REVIEW: 'bg-purple-100 text-purple-800',
        IN_REVIEW: 'bg-purple-100 text-purple-800',
        CLIENT_REVIEW: 'bg-amber-100 text-amber-800',
        CHANGES_REQUESTED: 'bg-rose-100 text-rose-800',
        APPROVED: 'bg-emerald-100 text-emerald-800',
        COMPLETED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-red-100 text-red-800',
      };

      return (
        <Badge className={`${statusColors[status]} hover:${statusColors[status]}`} variant="outline">
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    cell: ({ row }) => {
      if (row.original.user) return row.original.user.name;
      if (row.original.vendor) return `Vendor: ${row.original.vendor.name}`;
      return <span className="text-muted-foreground">Unassigned</span>;
    },
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => {
      const date = row.getValue('dueDate') as Date | null;
      if (!date) return <span className="text-muted-foreground">No date</span>;
      
      return (
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(date), 'PP')}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <TaskActionCell task={row.original} />,
  },
];
