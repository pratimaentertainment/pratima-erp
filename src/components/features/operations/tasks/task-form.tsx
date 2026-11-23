'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskStatus, WorkflowType } from '@prisma/client';
import { createTaskAction, updateTaskAction } from '@/actions/task.actions';
import { taskSchema } from '@/schemas/task.schema';

type FormData = {
  projectId: string;
  type: WorkflowType;
  status?: TaskStatus;
  dueDate?: Date | null;
  assignedTo?: string | null;
  vendorId?: string | null;
};

interface TaskFormProps {
  initialData?: any;
  projectId?: string; // Automatically populated if we create a task from the project page
}

export function TaskForm({ initialData, projectId }: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(taskSchema as any),
    defaultValues: {
      projectId: initialData?.projectId || projectId || '',
      type: initialData?.type || WorkflowType.PHOTO_EDITING,
      status: initialData?.status || TaskStatus.PENDING,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      assignedTo: initialData?.assignedTo || undefined,
      vendorId: initialData?.vendorId || undefined,
    },
  });

  const watchType = watch('type');
  const watchStatus = watch('status');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      let res;
      if (initialData?.id) {
        res = await updateTaskAction(initialData.id, data);
      } else {
        res = await createTaskAction(data);
      }

      if (res.success) {
        toast.success(`Task ${initialData?.id ? 'updated' : 'created'} successfully`);
        // If we know we came from a project context, go back there
        if (projectId) {
          router.push(`/operations/projects/${projectId}`);
        } else {
          router.push('/operations/tasks');
        }
      } else {
        toast.error(res.error || 'Failed to save task');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Project ID (hidden if passed as prop, else could be a select. For simplicity here, we assume it's passed or user can't change it easily here. If needed, we'd add a Project Select) */}
        {!projectId && (
          <div className="space-y-2 col-span-2">
            <Label htmlFor="projectId">Project ID <span className="text-red-500">*</span></Label>
            <Input 
              id="projectId" 
              placeholder="UUID of the project" 
              {...register('projectId')} 
            />
            {errors.projectId && <p className="text-sm text-red-500">{errors.projectId.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Task Type <span className="text-red-500">*</span></Label>
          <Select 
            value={watchType} 
            onValueChange={(val) => setValue('type', val as WorkflowType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WorkflowType).map(type => (
                <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={watchStatus} 
            onValueChange={(val) => setValue('status', val as TaskStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskStatus).map(status => (
                <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input 
            id="dueDate" 
            type="date"
            {...register('dueDate', { valueAsDate: true })} 
          />
          {errors.dueDate && <p className="text-sm text-red-500">{errors.dueDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned User ID</Label>
          <Input 
            id="assignedTo" 
            placeholder="User UUID (Optional)" 
            {...register('assignedTo')} 
          />
          <p className="text-xs text-muted-foreground">In a full UI, this would be a user dropdown.</p>
          {errors.assignedTo && <p className="text-sm text-red-500">{errors.assignedTo.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor ID</Label>
          <Input 
            id="vendorId" 
            placeholder="Vendor UUID (Optional)" 
            {...register('vendorId')} 
          />
          {errors.vendorId && <p className="text-sm text-red-500">{errors.vendorId.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (projectId) router.push(`/operations/projects/${projectId}`);
            else router.push('/operations/tasks');
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData?.id ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
