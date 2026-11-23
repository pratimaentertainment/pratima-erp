import { z } from 'zod';
import { WorkflowType, TaskStatus } from '@prisma/client';

export const taskSchema = z.object({
  eventBookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
  projectId: z.string().uuid('Invalid project ID').optional().nullable(),
  type: z.nativeEnum(WorkflowType),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedTo: z.union([z.string().uuid('Invalid user ID'), z.literal('')]).optional().nullable(),
  vendorId: z.union([z.string().uuid('Invalid vendor ID'), z.literal('')]).optional().nullable(),
});

export const updateTaskSchema = z.object({
  type: z.nativeEnum(WorkflowType).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedTo: z.union([z.string().uuid('Invalid user ID'), z.literal('')]).optional().nullable(),
  vendorId: z.union([z.string().uuid('Invalid vendor ID'), z.literal('')]).optional().nullable(),
});

export const assignTaskSchema = z.object({
  assignedTo: z.union([z.string().uuid('Invalid user ID'), z.literal('')]).optional().nullable(),
  vendorId: z.union([z.string().uuid('Invalid vendor ID'), z.literal('')]).optional().nullable(),
}).refine(data => data.assignedTo || data.vendorId, {
  message: 'Either user or vendor must be assigned',
  path: ['assignedTo'],
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
export type UpdateTaskFormValues = z.infer<typeof updateTaskSchema>;
export type AssignTaskFormValues = z.infer<typeof assignTaskSchema>;
