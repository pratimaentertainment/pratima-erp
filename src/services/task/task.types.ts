import { WorkflowType, TaskStatus } from '@prisma/client';

export interface CreateTaskDto {
  eventBookingId?: string | null;
  projectId?: string | null; // backwards compatibility
  type: WorkflowType;
  dueDate?: Date | null;
  assignedTo?: string | null;
  vendorId?: string | null;
  status?: TaskStatus;
}

export interface UpdateTaskDto {
  type?: WorkflowType;
  status?: TaskStatus;
  dueDate?: Date | null;
  assignedTo?: string | null;
  vendorId?: string | null;
}

export interface AssignTaskDto {
  assignedTo?: string | null;
  vendorId?: string | null;
}
