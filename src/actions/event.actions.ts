'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { StaffAssignmentStatus, Prisma } from '@prisma/client';

/**
 * Validates the authenticated session and returns user & tenant info.
 */
async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

export interface CreateSubEventPayload {
  eventBookingId: string;
  name: string;
  eventDate: string | Date;
  startTime: string;
  endTime: string;
  locationVenue?: string;
  notes?: string;
}

export async function createSubEventAction(payload: CreateSubEventPayload) {
  try {
    const { tenantId, userId } = await validateSession();

    if (!payload.eventBookingId) {
      return { success: false, error: 'Event Booking ID is required' };
    }
    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: 'Sub-event name is required' };
    }
    if (!payload.eventDate) {
      return { success: false, error: 'Event date is required' };
    }
    if (!payload.startTime || !payload.endTime) {
      return { success: false, error: 'Start and end time are required' };
    }

    const booking = await prisma.eventBooking.findFirst({
      where: {
        id: payload.eventBookingId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!booking) {
      return { success: false, error: 'Event booking not found or unauthorized' };
    }

    const parsedDate = new Date(payload.eventDate);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: 'Invalid event date provided' };
    }

    const subEvent = await prisma.subEvent.create({
      data: {
        tenantId,
        eventBookingId: booking.id,
        name: payload.name.trim(),
        eventDate: parsedDate,
        startTime: payload.startTime.trim(),
        endTime: payload.endTime.trim(),
        locationVenue: payload.locationVenue?.trim() || null,
        notes: payload.notes?.trim() || null,
      },
      include: {
        staffAssignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                designation: true,
                employmentType: true,
              },
            },
          },
        },
      },
    });

    // Revalidate paths
    revalidatePath('/customers');
    if (booking.customerId) {
      revalidatePath(`/customers/${booking.customerId}`);
    }
    if (booking.leadId) {
      revalidatePath(`/leads/${booking.leadId}`);
    }
    revalidatePath('/operations/calendar');

    const cleanData = JSON.parse(JSON.stringify(serializePrisma(subEvent)));
    return { success: true, data: cleanData };
  } catch (error: any) {
    console.error('[CREATE_SUB_EVENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to create sub-event' };
  }
}

export interface AssignStaffPayload {
  subEventId: string;
  userId: string;
  role: string;
  status?: StaffAssignmentStatus;
  payoutAmount?: number | string | null;
  notes?: string;
}

export async function assignStaffToEventAction(payload: AssignStaffPayload) {
  try {
    const { tenantId } = await validateSession();

    if (!payload.subEventId) {
      return { success: false, error: 'Sub-event ID is required' };
    }
    if (!payload.userId) {
      return { success: false, error: 'Staff member selection is required' };
    }
    if (!payload.role || !payload.role.trim()) {
      return { success: false, error: 'Staff role is required' };
    }

    const subEvent = await prisma.subEvent.findFirst({
      where: {
        id: payload.subEventId,
        tenantId,
        deletedAt: null,
      },
      include: {
        eventBooking: true,
      },
    });

    if (!subEvent) {
      return { success: false, error: 'Sub-event not found or unauthorized' };
    }

    // Verify staff user belongs to this tenant and fetch employmentType
    const staffUser = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, employmentType: true },
    });

    if (!staffUser) {
      return { success: false, error: 'Selected staff member not found' };
    }

    let parsedPayout: Prisma.Decimal | null = null;
    if (
      payload.payoutAmount !== undefined &&
      payload.payoutAmount !== null &&
      payload.payoutAmount !== ''
    ) {
      const num = Number(payload.payoutAmount);
      if (!isNaN(num) && num >= 0) {
        parsedPayout = new Prisma.Decimal(num);
      }
    }

    const assignment = await prisma.staffAssignment.create({
      data: {
        tenantId,
        subEventId: subEvent.id,
        userId: staffUser.id,
        role: payload.role.trim(),
        status: payload.status || StaffAssignmentStatus.CONFIRMED,
        payoutAmount: parsedPayout,
        notes: payload.notes?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
            employmentType: true,
          },
        },
      },
    });

    // Revalidate paths
    revalidatePath('/customers');
    if (subEvent.eventBooking?.customerId) {
      revalidatePath(`/customers/${subEvent.eventBooking.customerId}`);
    }
    if (subEvent.eventBooking?.leadId) {
      revalidatePath(`/leads/${subEvent.eventBooking.leadId}`);
    }
    revalidatePath('/operations/calendar');

    const cleanData = JSON.parse(JSON.stringify(serializePrisma(assignment)));
    return { success: true, data: cleanData };
  } catch (error: any) {
    console.error('[ASSIGN_STAFF_ERROR]', error);
    return { success: false, error: error.message || 'Failed to assign staff' };
  }
}

export async function deleteStaffAssignmentAction(assignmentId: string) {
  try {
    const { tenantId } = await validateSession();

    const assignment = await prisma.staffAssignment.findFirst({
      where: { id: assignmentId, tenantId },
      include: {
        subEvent: {
          include: {
            eventBooking: true,
          },
        },
      },
    });

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    await prisma.staffAssignment.delete({
      where: { id: assignmentId },
    });

    if (assignment.subEvent?.eventBooking?.customerId) {
      revalidatePath(`/customers/${assignment.subEvent.eventBooking.customerId}`);
    }
    revalidatePath('/operations/calendar');

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_STAFF_ASSIGNMENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to remove staff assignment' };
  }
}

export async function getAvailableStaffAction() {
  try {
    const { tenantId } = await validateSession();

    const staffList = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        skills: true,
        employmentType: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: staffList };
  } catch (error: any) {
    console.error('[GET_STAFF_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch staff members' };
  }
}
