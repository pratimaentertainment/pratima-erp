'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { FollowUpStatus, FollowUpOutcome } from '@prisma/client';

export type FollowUpDashboardResponse<T = any> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Fetch all follow-ups globally for the authenticated tenant and group them into:
 * Overdue, Today, and Upcoming.
 */
export async function getCentralizedFollowUpsAction(): Promise<
  FollowUpDashboardResponse<{
    overdue: any[];
    today: any[];
    upcoming: any[];
    completed: any[];
    stats: {
      totalPending: number;
      overdueCount: number;
      todayCount: number;
      upcomingCount: number;
      completedCount: number;
    };
  }>
> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const tenantId = user.tenantId;

    // 1. Fetch all pending and rescheduled follow-ups
    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: [FollowUpStatus.PENDING, FollowUpStatus.RESCHEDULED] },
      },
      include: {
        lead: {
          include: {
            customer: true,
            assignedTo: true,
            package: true,
            inquiry: {
              include: { leadSource: true },
            },
          },
        },
        assignedTo: true,
      },
      orderBy: { followUpDate: 'asc' },
    });

    // 2. Fetch recently completed follow-ups
    const completedFollowUps = await prisma.followUp.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: FollowUpStatus.COMPLETED,
      },
      include: {
        lead: {
          include: {
            customer: true,
            assignedTo: true,
            package: true,
          },
        },
        assignedTo: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 30,
    });

    // 3. Strict Date Grouping: Overdue (< Today), Today (== Today), Upcoming (> Today)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const overdue: any[] = [];
    const today: any[] = [];
    const upcoming: any[] = [];

    for (const item of pendingFollowUps) {
      const itemDate = new Date(item.followUpDate);
      if (itemDate < todayStart) {
        overdue.push(item);
      } else if (itemDate >= todayStart && itemDate <= todayEnd) {
        today.push(item);
      } else {
        upcoming.push(item);
      }
    }

    const stats = {
      totalPending: pendingFollowUps.length,
      overdueCount: overdue.length,
      todayCount: today.length,
      upcomingCount: upcoming.length,
      completedCount: completedFollowUps.length,
    };

    return {
      success: true,
      data: {
        overdue: serializePrisma(overdue),
        today: serializePrisma(today),
        upcoming: serializePrisma(upcoming),
        completed: serializePrisma(completedFollowUps),
        stats,
      },
    };
  } catch (error: any) {
    console.error('[GET_CENTRALIZED_FOLLOW_UPS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch centralized follow-ups' };
  }
}

/**
 * Mark a follow-up as complete directly from the centralized dashboard.
 */
export async function completeFollowUpQuickAction(
  followUpId: string,
  notes?: string,
  outcome?: string
): Promise<FollowUpDashboardResponse<any>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const tenantId = user.tenantId;

    const existing = await prisma.followUp.findFirst({
      where: { id: followUpId, tenantId, deletedAt: null },
      include: { lead: true },
    });

    if (!existing) {
      return { success: false, error: 'Follow-up record not found' };
    }

    const completedAt = new Date();
    const resolvedOutcome = outcome && Object.values(FollowUpOutcome).includes(outcome as any)
      ? (outcome as FollowUpOutcome)
      : existing.outcome || FollowUpOutcome.OTHER;

    const appendedNotes = notes
      ? existing.notes
        ? `${existing.notes}\n[Completed Notes]: ${notes}`
        : notes
      : existing.notes;

    const updated = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: FollowUpStatus.COMPLETED,
        completedAt,
        outcome: resolvedOutcome,
        notes: appendedNotes,
        reminderStatus: null,
        updatedById: user.id,
      },
      include: {
        lead: {
          include: { customer: true, assignedTo: true },
        },
        assignedTo: true,
      },
    });

    // Record activity milestone on the lead
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId: existing.leadId,
        action: 'FOLLOW_UP_COMPLETED',
        notes: `Follow-up (${existing.type}) completed.${notes ? ` Outcome notes: "${notes}"` : ''}`,
        createdById: user.id,
      },
    });

    revalidatePath('/operations/follow-ups');
    revalidatePath(`/leads/${existing.leadId}`);
    revalidatePath('/leads');

    return {
      success: true,
      data: serializePrisma(updated),
      message: 'Follow-up marked as completed successfully.',
    };
  } catch (error: any) {
    console.error('[COMPLETE_FOLLOW_UP_QUICK_ERROR]', error);
    return { success: false, error: error.message || 'Failed to complete follow-up' };
  }
}

/**
 * Reschedule a follow-up to a new target date directly from the dashboard.
 */
export async function rescheduleFollowUpQuickAction(
  followUpId: string,
  newDate: Date | string,
  rescheduleReason?: string
): Promise<FollowUpDashboardResponse<any>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const tenantId = user.tenantId;

    const existing = await prisma.followUp.findFirst({
      where: { id: followUpId, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Follow-up record not found' };
    }

    const targetDate = new Date(newDate);
    if (isNaN(targetDate.getTime())) {
      return { success: false, error: 'Invalid scheduled date' };
    }

    const noteAppend = rescheduleReason
      ? existing.notes
        ? `${existing.notes}\n[Rescheduled]: ${rescheduleReason}`
        : `[Rescheduled]: ${rescheduleReason}`
      : existing.notes;

    const updated = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: FollowUpStatus.RESCHEDULED,
        followUpDate: targetDate,
        notes: noteAppend,
        updatedById: user.id,
      },
      include: {
        lead: {
          include: { customer: true, assignedTo: true },
        },
        assignedTo: true,
      },
    });

    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId: existing.leadId,
        action: 'FOLLOW_UP_RESCHEDULED',
        notes: `Follow-up rescheduled to ${targetDate.toLocaleDateString()}.${rescheduleReason ? ` Reason: "${rescheduleReason}"` : ''}`,
        createdById: user.id,
      },
    });

    revalidatePath('/operations/follow-ups');
    revalidatePath(`/leads/${existing.leadId}`);

    return {
      success: true,
      data: serializePrisma(updated),
      message: 'Follow-up rescheduled successfully.',
    };
  } catch (error: any) {
    console.error('[RESCHEDULE_FOLLOW_UP_QUICK_ERROR]', error);
    return { success: false, error: error.message || 'Failed to reschedule follow-up' };
  }
}
