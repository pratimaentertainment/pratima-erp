import { ServiceContext } from '@/lib/application/utils/context';
import { prisma } from '@/lib/prisma';
import { EventBookingStatus, TaskStatus } from '@prisma/client';

export class OperationsMetricsService {
  /**
   * Get total number of active bookings for the current branch
   */
  static async getActiveProjects(ctx: ServiceContext): Promise<number> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required');
    }

    return prisma.eventBooking.count({
      where: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        deletedAt: null,
        status: EventBookingStatus.CONFIRMED,
      },
    });
  }

  /**
   * Get total number of upcoming sub-events for the current branch
   */
  static async getUpcomingShoots(ctx: ServiceContext): Promise<number> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required');
    }

    return prisma.subEvent.count({
      where: {
        eventDate: {
          gt: new Date(),
        },
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get total number of pending tasks for the current branch
   */
  static async getPendingTasks(ctx: ServiceContext): Promise<number> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required');
    }

    return prisma.workflowTask.count({
      where: {
        status: {
          not: TaskStatus.COMPLETED,
        },
        tenantId: ctx.tenantId,
      },
    });
  }

  /**
   * Get all operations metrics at once
   */
  static async getDashboardMetrics(ctx: ServiceContext) {
    const [activeProjects, upcomingShoots, pendingTasks] = await Promise.all([
      this.getActiveProjects(ctx),
      this.getUpcomingShoots(ctx),
      this.getPendingTasks(ctx),
    ]);

    return {
      activeProjects,
      upcomingShoots,
      pendingTasks
    };
  }
}
