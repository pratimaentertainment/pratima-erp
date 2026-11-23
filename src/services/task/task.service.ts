import { WorkflowTaskRepository, WorkflowTaskListOptions } from '@/repositories/workflow-task.repository';
import { ServiceContext } from '@/lib/application/utils/context';
import { CreateTaskDto, UpdateTaskDto, AssignTaskDto } from './task.types';
import { WorkflowTask, TaskStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class TaskService {
  /**
   * Create a new task with strict tenant isolation
   */
  static async createTask(
    ctx: ServiceContext,
    data: CreateTaskDto
  ): Promise<WorkflowTask> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to create a task');
    }

    if (data.assignedTo) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedTo, tenantId: ctx.tenantId },
      });
      if (!user) throw new Error('Assigned user not found in current tenant');
    }

    if (data.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: data.vendorId, tenantId: ctx.tenantId },
      });
      if (!vendor) throw new Error('Vendor not found in current tenant');
    }

    const bookingId = data.eventBookingId || data.projectId;

    return WorkflowTaskRepository.create({
      tenant: { connect: { id: ctx.tenantId } },
      ...(bookingId ? { eventBooking: { connect: { id: bookingId } } } : {}),
      type: data.type,
      status: data.status || TaskStatus.PENDING,
      dueDate: data.dueDate,
      ...(data.assignedTo ? { user: { connect: { id: data.assignedTo } } } : {}),
      ...(data.vendorId ? { vendor: { connect: { id: data.vendorId } } } : {}),
    });
  }

  /**
   * Get task by ID
   */
  static async getTaskById(
    ctx: ServiceContext,
    id: string
  ): Promise<WorkflowTask | null> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to get a task');
    }

    const task = await WorkflowTaskRepository.findById(id, ctx.tenantId);
    if (!task) return null;

    return task;
  }

  /**
   * Get all tasks
   */
  static async getTasks(
    ctx: ServiceContext,
    options: WorkflowTaskListOptions = {}
  ): Promise<{ data: WorkflowTask[]; total: number }> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to get tasks');
    }

    return WorkflowTaskRepository.findAll(ctx.tenantId, ctx.branchId, options);
  }

  /**
   * Get all tasks for an event booking / project
   */
  static async getProjectTasks(
    ctx: ServiceContext,
    projectIdOrBookingId: string,
    options: Omit<WorkflowTaskListOptions, 'filters'> = {}
  ): Promise<{ data: WorkflowTask[]; total: number }> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to get tasks');
    }

    return WorkflowTaskRepository.findAll(ctx.tenantId, ctx.branchId, {
      ...options,
      filters: { eventBookingId: projectIdOrBookingId },
    });
  }

  /**
   * Update a task
   */
  static async updateTask(
    ctx: ServiceContext,
    id: string,
    data: UpdateTaskDto
  ): Promise<WorkflowTask> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to update a task');
    }

    const existingTask = await this.getTaskById(ctx, id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (data.assignedTo) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedTo, tenantId: ctx.tenantId },
      });
      if (!user) throw new Error('Assigned user not found in current tenant');
    }

    if (data.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: data.vendorId, tenantId: ctx.tenantId },
      });
      if (!vendor) throw new Error('Vendor not found in current tenant');
    }

    const updateData: Prisma.WorkflowTaskUpdateInput = {
      ...(data.type && { type: data.type }),
      ...(data.status && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    };

    if (data.assignedTo !== undefined) {
      if (data.assignedTo === null || data.assignedTo === '') {
        updateData.user = { disconnect: true };
      } else {
        updateData.user = { connect: { id: data.assignedTo } };
      }
    }

    if (data.vendorId !== undefined) {
      if (data.vendorId === null || data.vendorId === '') {
        updateData.vendor = { disconnect: true };
      } else {
        updateData.vendor = { connect: { id: data.vendorId } };
      }
    }

    return WorkflowTaskRepository.update(id, updateData);
  }

  /**
   * Delete a task
   */
  static async deleteTask(
    ctx: ServiceContext,
    id: string
  ): Promise<WorkflowTask> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to delete a task');
    }

    const existingTask = await this.getTaskById(ctx, id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return WorkflowTaskRepository.delete(id);
  }

  /**
   * Assign task
   */
  static async assignTask(
    ctx: ServiceContext,
    id: string,
    data: AssignTaskDto
  ): Promise<WorkflowTask> {
    return this.updateTask(ctx, id, {
      assignedTo: data.assignedTo,
      vendorId: data.vendorId,
    });
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(
    ctx: ServiceContext,
    id: string,
    status: TaskStatus
  ): Promise<WorkflowTask> {
    return this.updateTask(ctx, id, { status });
  }
}
