'use server';

import { revalidatePath } from 'next/cache';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { PERMISSIONS } from '@/constants/permissions.constants';
import { TaskService } from '@/services/task/task.service';
import {
  taskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateTaskStatusSchema,
} from '@/schemas/task.schema';
import { ActionResponse } from '@/actions/action-response';
import { WorkflowTask } from '@prisma/client';

export async function createTaskAction(
  data: unknown
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.CREATE);
    
    const validatedData = taskSchema.parse(data);
    
    const task = await TaskService.createTask(ctx, validatedData);
    
    revalidatePath('/operations/bookings');
    if (task.eventBookingId) {
      revalidatePath(`/operations/bookings/${task.eventBookingId}`);
    }
    revalidatePath('/operations/tasks');
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create task' };
  }
}

export async function getTaskByIdAction(
  id: string
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.VIEW);
    const task = await TaskService.getTaskById(ctx, id);
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch task' };
  }
}

export async function getProjectTasksAction(
  projectIdOrBookingId: string
): Promise<ActionResponse<WorkflowTask[]>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.VIEW);
    const result = await TaskService.getProjectTasks(ctx, projectIdOrBookingId);
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch project tasks' };
  }
}

export async function getTasksAction(
  filters?: any
): Promise<ActionResponse<WorkflowTask[]>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.VIEW);
    const result = await TaskService.getTasks(ctx, { filters });
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tasks' };
  }
}

export async function updateTaskAction(
  id: string,
  data: unknown
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.UPDATE);
    
    const validatedData = updateTaskSchema.parse(data);
    
    const task = await TaskService.updateTask(ctx, id, validatedData);
    
    revalidatePath('/operations/bookings');
    if (task.eventBookingId) {
      revalidatePath(`/operations/bookings/${task.eventBookingId}`);
    }
    revalidatePath('/operations/tasks');
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update task' };
  }
}

export async function deleteTaskAction(
  id: string
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.DELETE);
    
    const task = await TaskService.deleteTask(ctx, id);
    
    revalidatePath('/operations/bookings');
    if (task.eventBookingId) {
      revalidatePath(`/operations/bookings/${task.eventBookingId}`);
    }
    revalidatePath('/operations/tasks');
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete task' };
  }
}

export async function assignTaskAction(
  id: string,
  data: unknown
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.UPDATE);
    
    const validatedData = assignTaskSchema.parse(data);
    
    const task = await TaskService.assignTask(ctx, id, validatedData);
    
    revalidatePath('/operations/bookings');
    if (task.eventBookingId) {
      revalidatePath(`/operations/bookings/${task.eventBookingId}`);
    }
    revalidatePath('/operations/tasks');
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign task' };
  }
}

export async function updateTaskStatusAction(
  id: string,
  data: unknown
): Promise<ActionResponse<WorkflowTask>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.WORKFLOW_TASKS.UPDATE);
    
    const validatedData = updateTaskStatusSchema.parse(data);
    
    const task = await TaskService.updateTaskStatus(ctx, id, validatedData.status);
    
    revalidatePath('/operations/bookings');
    if (task.eventBookingId) {
      revalidatePath(`/operations/bookings/${task.eventBookingId}`);
    }
    revalidatePath('/operations/tasks');
    
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update task status' };
  }
}
