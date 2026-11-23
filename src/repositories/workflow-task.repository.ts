import { Prisma, WorkflowTask, TaskStatus, WorkflowType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface WorkflowTaskFilters {
  eventBookingId?: string;
  projectId?: string; // backwards compatibility
  assignedTo?: string;
  vendorId?: string;
  status?: TaskStatus;
  type?: WorkflowType;
  dueDateStart?: Date;
  dueDateEnd?: Date;
}

export interface WorkflowTaskListOptions {
  skip?: number;
  take?: number;
  filters?: WorkflowTaskFilters;
}

export class WorkflowTaskRepository {
  /**
   * Create a new task
   */
  static async create(data: Prisma.WorkflowTaskCreateInput): Promise<WorkflowTask> {
    return prisma.workflowTask.create({
      data,
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        eventBooking: {
          select: { id: true, bookingNumber: true, title: true },
        },
      },
    });
  }

  /**
   * Find task by ID
   */
  static async findById(id: string, tenantId?: string): Promise<WorkflowTask | null> {
    return prisma.workflowTask.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        eventBooking: {
          select: { id: true, bookingNumber: true, title: true },
        },
      },
    });
  }

  /**
   * Find all tasks with tenant/branch isolation and filters
   */
  static async findAll(
    tenantId: string,
    branchId: string,
    options: WorkflowTaskListOptions = {}
  ): Promise<{ data: WorkflowTask[]; total: number }> {
    const { skip, take, filters } = options;

    const where: Prisma.WorkflowTaskWhereInput = {
      tenantId,
    };

    const bookingId = filters?.eventBookingId || filters?.projectId;
    if (bookingId) {
      where.eventBookingId = bookingId;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = filters.dueDateStart;
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = filters.dueDateEnd;
      }
    }

    const [data, total] = await Promise.all([
      prisma.workflowTask.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, profileImage: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
          eventBooking: {
            select: { id: true, bookingNumber: true, title: true },
          },
        },
      }),
      prisma.workflowTask.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update task
   */
  static async update(id: string, data: Prisma.WorkflowTaskUpdateInput, tenantId?: string): Promise<WorkflowTask> {
    if (tenantId) {
      const existing = await prisma.workflowTask.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!existing) throw new Error('Workflow task not found or unauthorized');
    }
    return prisma.workflowTask.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        eventBooking: {
          select: { id: true, bookingNumber: true, title: true },
        },
      },
    });
  }

  /**
   * Delete task
   */
  static async delete(id: string, tenantId?: string): Promise<WorkflowTask> {
    if (tenantId) {
      const existing = await prisma.workflowTask.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!existing) throw new Error('Workflow task not found or unauthorized');
    }
    return prisma.workflowTask.delete({
      where: { id },
    });
  }
}
