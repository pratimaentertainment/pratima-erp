'use server';

import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { DispatchService } from '@/services/dispatch.service';
import { EquipmentCategory, AssetStatus, GearAllocationStatus, StaffAssignmentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
    branchId: (user.branchId || null) as string | null,
  };
}

const assignCrewSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  userId: z.string().uuid('Invalid crew user ID'),
  role: z.string().min(2, 'Role must be at least 2 characters'),
  agreedPayment: z.union([z.number().min(0), z.string(), z.null()]).optional(),
  notes: z.string().optional(),
});

const createEquipmentSchema = z.object({
  name: z.string().min(2, 'Equipment name must be at least 2 characters'),
  category: z.nativeEnum(EquipmentCategory),
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.AVAILABLE),
  notes: z.string().optional(),
});

const updateEquipmentStatusSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  status: z.nativeEnum(AssetStatus),
  notes: z.string().optional(),
});

/**
 * Fetches upcoming confirmed and blocked events for crew dispatch.
 */
export async function getUpcomingDispatchEventsAction() {
  try {
    const { tenantId } = await validateSession();
    const events = await DispatchService.getUpcomingDispatchEvents(tenantId);
    return { success: true, data: events };
  } catch (error: any) {
    console.error('[GET_DISPATCH_EVENTS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch dispatch events' };
  }
}

/**
 * Assigns a crew/team member to an event with agreed payout and prepares/sends WhatsApp notification.
 */
export async function assignTeamMemberAndNotifyAction(input: z.infer<typeof assignCrewSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = assignCrewSchema.parse(input);

    const result = await DispatchService.assignTeamMemberAndNotify({
      ...validated,
      tenantId,
    });

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations/bookings');
    revalidatePath('/operations');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[ASSIGN_TEAM_MEMBER_ERROR]', error);
    return { success: false, error: error.message || 'Failed to assign crew member' };
  }
}

/**
 * Triggers 24h event reminders for all events starting in the next 24 hours.
 */
export async function sendEventRemindersAction() {
  try {
    await validateSession();
    const result = await DispatchService.sendEventReminders();

    revalidatePath('/operations/dispatch');

    return {
      success: true,
      data: result,
      message: `Dispatched ${result.totalRemindersSent} reminder notifications across ${result.totalRemindedEvents} events.`,
    };
  } catch (error: any) {
    console.error('[SEND_EVENT_REMINDERS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to send event reminders' };
  }
}

/**
 * Fetches equipment inventory items for the current tenant.
 */
export async function getEquipmentInventoryAction() {
  try {
    const { tenantId } = await validateSession();
    const inventory = await DispatchService.getEquipmentInventory(tenantId);
    return { success: true, data: inventory };
  } catch (error: any) {
    console.error('[GET_EQUIPMENT_INVENTORY_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch equipment inventory' };
  }
}

/**
 * Adds a new piece of equipment to inventory.
 */
export async function createEquipmentAction(input: z.infer<typeof createEquipmentSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createEquipmentSchema.parse(input);

    const item = await DispatchService.createEquipmentItem(validated, tenantId);

    revalidatePath('/operations/dispatch');

    return { success: true, data: serializePrisma(item) };
  } catch (error: any) {
    console.error('[CREATE_EQUIPMENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to add equipment item' };
  }
}

/**
 * Updates the operational status of an equipment item.
 */
export async function updateEquipmentStatusAction(input: z.infer<typeof updateEquipmentStatusSchema>) {
  try {
    await validateSession();
    const validated = updateEquipmentStatusSchema.parse(input);

    const updated = await DispatchService.updateEquipmentStatus(
      validated.equipmentId,
      validated.status,
      validated.notes
    );

    revalidatePath('/operations/dispatch');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[UPDATE_EQUIPMENT_STATUS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update equipment status' };
  }
}

/**
 * Fetches active team members available for crew dispatch.
 */
export async function getTeamMembersAction() {
  try {
    const { tenantId } = await validateSession();

    const members = await prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        employmentType: true,
        skills: true,
        rating: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: serializePrisma(members) };
  } catch (error: any) {
    console.error('[GET_TEAM_MEMBERS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch team members' };
  }
}

// -----------------------------------------------------------------------------
// CONFIGURABLE EQUIPMENT DISPATCH & CHECKOUT ENGINE
// -----------------------------------------------------------------------------

const checkoutGearSchema = z.object({
  allocationId: z.string().uuid('Invalid allocation ID'),
  scannedAssetTag: z.string().optional().nullable(),
  checklist: z.union([z.record(z.string(), z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  shutterCount: z.number().int().min(0).optional().nullable(),
});

export type CheckoutGearInput = z.infer<typeof checkoutGearSchema>;

const checkinGearSchema = z.object({
  allocationId: z.string().uuid('Invalid allocation ID'),
  scannedAssetTag: z.string().optional().nullable(),
  checklist: z.union([z.record(z.string(), z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  shutterCount: z.number().int().min(0).optional().nullable(),
  isDamaged: z.boolean().optional().default(false),
});

export type CheckinGearInput = z.infer<typeof checkinGearSchema>;

/**
 * Dispatches and checks out allocated equipment for a shoot.
 * Intelligently switches behavior based on Tenant.isAdvancedInventoryEnabled:
 * - Simple Mode: Instant frictionless status update without QR scan requirements.
 * - Advanced Mode: Strict asset tag barcode/QR verification, accessories checklist logging,
 *   shutter count capture, and an immutable GearCheckLog audit entry.
 */
export async function checkoutGearAction(input: CheckoutGearInput) {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = checkoutGearSchema.parse(input);

    // Step A (Validation): Fetch ShootGearAllocation with linked Equipment and Tenant
    const allocation = await prisma.shootGearAllocation.findFirst({
      where: {
        id: validated.allocationId,
        tenantId,
      },
      include: {
        equipment: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isAdvancedInventoryEnabled: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
          },
        },
      },
    });

    if (!allocation) {
      return { success: false, error: 'Shoot gear allocation record not found or unauthorized.' };
    }

    if (!allocation.equipment) {
      return { success: false, error: 'Equipment record linked to allocation was not found.' };
    }

    if (
      allocation.status === GearAllocationStatus.CHECKED_OUT ||
      allocation.status === GearAllocationStatus.IN_FIELD
    ) {
      return { success: false, error: 'Equipment is already checked out for this shoot.' };
    }

    if (allocation.status === GearAllocationStatus.RETURNED) {
      return { success: false, error: 'Cannot checkout gear that has already been returned.' };
    }

    if (
      allocation.equipment.status === AssetStatus.MAINTENANCE ||
      allocation.equipment.status === AssetStatus.RETIRED
    ) {
      return {
        success: false,
        error: `Cannot dispatch equipment: current status is ${allocation.equipment.status}.`,
      };
    }

    const isAdvanced = Boolean(allocation.tenant.isAdvancedInventoryEnabled);

    // Step B (Dual-Logic Routing)
    let result;

    if (!isAdvanced) {
      // -------------------------------------------------------------
      // Simple Mode (tenant.isAdvancedInventoryEnabled == false)
      // -------------------------------------------------------------
      // Skip QR/Barcode validation.
      // Update ShootGearAllocation status to CHECKED_OUT, set checkedOutAt = now().
      // Update Equipment status to IN_USE.
      result = await prisma.$transaction(async (tx) => {
        const now = new Date();

        const updatedAllocation = await tx.shootGearAllocation.update({
          where: { id: allocation.id },
          data: {
            status: GearAllocationStatus.CHECKED_OUT,
            checkedOutAt: now,
            checkoutNotes: validated.notes?.trim() || allocation.checkoutNotes,
          },
          include: {
            equipment: true,
            assignedTo: true,
            eventBooking: true,
          },
        });

        const updatedEquipment = await tx.equipment.update({
          where: { id: allocation.equipmentId },
          data: {
            status: AssetStatus.IN_USE,
          },
        });

        // Sync legacy checkout table
        await tx.equipmentCheckout.create({
          data: {
            equipmentId: allocation.equipmentId,
            checkedOutAt: now,
          },
        });

        return {
          mode: 'SIMPLE' as const,
          allocation: updatedAllocation,
          equipment: updatedEquipment,
          gearCheckLog: null,
        };
      });
    } else {
      // -------------------------------------------------------------
      // Advanced Mode (tenant.isAdvancedInventoryEnabled == true)
      // -------------------------------------------------------------
      // Strict Validation: Ensure scannedAssetTag is provided and strictly matches Equipment.assetTag.
      // If it fails, throw an error ("Scanned item does not match allocated gear").
      const scannedTag = validated.scannedAssetTag?.trim();
      if (!scannedTag) {
        return {
          success: false,
          error: 'Scanned item does not match allocated gear: Asset tag scan is required in Advanced Inventory mode.',
        };
      }

      const expectedTag = allocation.equipment.assetTag?.trim();
      if (!expectedTag || scannedTag.toLowerCase() !== expectedTag.toLowerCase()) {
        return {
          success: false,
          error: `Scanned item does not match allocated gear. Expected asset tag "${expectedTag || 'UNTAGGED'}", but got "${scannedTag}".`,
        };
      }

      result = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const shutterCountAtCheck =
          validated.shutterCount ?? allocation.equipment.currentShutterCount ?? 0;

        let parsedChecklist: Prisma.InputJsonValue | undefined = undefined;
        if (validated.checklist !== undefined && validated.checklist !== null) {
          if (typeof validated.checklist === 'string') {
            try {
              parsedChecklist = JSON.parse(validated.checklist);
            } catch {
              parsedChecklist = { note: validated.checklist };
            }
          } else {
            parsedChecklist = validated.checklist as Prisma.InputJsonValue;
          }
        }

        // Create GearCheckLog record (checkType: 'DISPATCH_OUT')
        const gearCheckLog = await tx.gearCheckLog.create({
          data: {
            tenantId,
            allocationId: allocation.id,
            checkType: 'DISPATCH_OUT',
            scannedAssetTag: scannedTag,
            shutterCountAtCheck,
            accessoriesChecklist: parsedChecklist ?? undefined,
            conditionNotes: validated.notes?.trim() || null,
            verifiedByUserId: userId,
            timestamp: now,
          },
          include: {
            verifiedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Update ShootGearAllocation
        const updatedAllocation = await tx.shootGearAllocation.update({
          where: { id: allocation.id },
          data: {
            status: GearAllocationStatus.CHECKED_OUT,
            checkedOutAt: now,
            checkoutNotes: validated.notes?.trim() || allocation.checkoutNotes,
          },
          include: {
            equipment: true,
            assignedTo: true,
            eventBooking: true,
            gearCheckLogs: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        });

        // Update Equipment status to IN_USE and shutter count if applicable
        const updatedEquipment = await tx.equipment.update({
          where: { id: allocation.equipmentId },
          data: {
            status: AssetStatus.IN_USE,
            ...(validated.shutterCount !== undefined &&
            validated.shutterCount !== null &&
            validated.shutterCount > allocation.equipment.currentShutterCount
              ? { currentShutterCount: validated.shutterCount }
              : {}),
          },
        });

        // Sync legacy checkout table
        await tx.equipmentCheckout.create({
          data: {
            equipmentId: allocation.equipmentId,
            checkedOutAt: now,
          },
        });

        return {
          mode: 'ADVANCED' as const,
          allocation: updatedAllocation,
          equipment: updatedEquipment,
          gearCheckLog,
        };
      });
    }

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations/shoots');
    revalidatePath('/operations/inventory');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(result),
      message: `Equipment "${allocation.equipment.name}" checked out successfully (${result.mode} mode).`,
    };
  } catch (error: any) {
    console.error('[CHECKOUT_GEAR_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to checkout gear',
    };
  }
}

/**
 * Checks in and returns equipment from a shoot allocation.
 * Supports both Simple mode and Advanced QR verification with shutter count auditing.
 */
export async function checkinGearAction(input: CheckinGearInput) {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = checkinGearSchema.parse(input);

    const allocation = await prisma.shootGearAllocation.findFirst({
      where: {
        id: validated.allocationId,
        tenantId,
      },
      include: {
        equipment: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isAdvancedInventoryEnabled: true,
          },
        },
      },
    });

    if (!allocation) {
      return { success: false, error: 'Shoot gear allocation record not found or unauthorized.' };
    }

    if (!allocation.equipment) {
      return { success: false, error: 'Equipment record linked to allocation was not found.' };
    }

    if (allocation.status === GearAllocationStatus.RETURNED) {
      return { success: false, error: 'Equipment has already been returned.' };
    }

    const isAdvanced = Boolean(allocation.tenant.isAdvancedInventoryEnabled);

    if (isAdvanced) {
      const scannedTag = validated.scannedAssetTag?.trim();
      if (!scannedTag) {
        return {
          success: false,
          error: 'Scanned item does not match allocated gear: Asset tag scan is required in Advanced Inventory mode.',
        };
      }

      const expectedTag = allocation.equipment.assetTag?.trim();
      if (!expectedTag || scannedTag.toLowerCase() !== expectedTag.toLowerCase()) {
        return {
          success: false,
          error: `Scanned item does not match allocated gear. Expected asset tag "${expectedTag || 'UNTAGGED'}", but got "${scannedTag}".`,
        };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const nextGearStatus = validated.isDamaged
        ? GearAllocationStatus.DAMAGED
        : GearAllocationStatus.RETURNED;
      const nextAssetStatus = validated.isDamaged
        ? AssetStatus.MAINTENANCE
        : AssetStatus.AVAILABLE;

      let gearCheckLog = null;
      if (isAdvanced) {
        const shutterCountAtCheck =
          validated.shutterCount ?? allocation.equipment.currentShutterCount ?? 0;

        let parsedChecklist: Prisma.InputJsonValue | undefined = undefined;
        if (validated.checklist !== undefined && validated.checklist !== null) {
          if (typeof validated.checklist === 'string') {
            try {
              parsedChecklist = JSON.parse(validated.checklist);
            } catch {
              parsedChecklist = { note: validated.checklist };
            }
          } else {
            parsedChecklist = validated.checklist as Prisma.InputJsonValue;
          }
        }

        gearCheckLog = await tx.gearCheckLog.create({
          data: {
            tenantId,
            allocationId: allocation.id,
            checkType: 'RETURN_IN',
            scannedAssetTag: validated.scannedAssetTag?.trim() || null,
            shutterCountAtCheck,
            accessoriesChecklist: parsedChecklist ?? undefined,
            conditionNotes: validated.notes?.trim() || null,
            verifiedByUserId: userId,
            timestamp: now,
          },
          include: {
            verifiedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      }

      const updatedAllocation = await tx.shootGearAllocation.update({
        where: { id: allocation.id },
        data: {
          status: nextGearStatus,
          returnedAt: now,
          returnNotes: validated.notes?.trim() || allocation.returnNotes,
        },
        include: {
          equipment: true,
          assignedTo: true,
          eventBooking: true,
          gearCheckLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      const updatedEquipment = await tx.equipment.update({
        where: { id: allocation.equipmentId },
        data: {
          status: nextAssetStatus,
          ...(validated.shutterCount !== undefined &&
          validated.shutterCount !== null &&
          validated.shutterCount > allocation.equipment.currentShutterCount
            ? { currentShutterCount: validated.shutterCount }
            : {}),
        },
      });

      // Close legacy checkout record
      const activeCheckout = await tx.equipmentCheckout.findFirst({
        where: { equipmentId: allocation.equipmentId, returnedAt: null },
        orderBy: { checkedOutAt: 'desc' },
      });

      if (activeCheckout) {
        await tx.equipmentCheckout.update({
          where: { id: activeCheckout.id },
          data: { returnedAt: now },
        });
      }

      return {
        mode: isAdvanced ? ('ADVANCED' as const) : ('SIMPLE' as const),
        allocation: updatedAllocation,
        equipment: updatedEquipment,
        gearCheckLog,
      };
    });

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations/shoots');
    revalidatePath('/operations/inventory');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(result),
      message: `Equipment "${allocation.equipment.name}" checked in successfully (${result.mode} mode).`,
    };
  } catch (error: any) {
    console.error('[CHECKIN_GEAR_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to check in gear',
    };
  }
}

// =========================================================================
// PHASE 14.1: UNIFIED BOOKING COMMAND CENTER & SHOOT DISPATCH SERVER ACTIONS
// =========================================================================

/**
 * Assigns a staff or freelance crew member to a specific SubEvent function.
 * Performs date conflict checking to prevent double-booking crew members across overlapping shoots.
 */
export async function assignCrewToSubEvent(
  subEventId: string,
  userId: string,
  role: string,
  payoutAmount?: number | null,
  notes?: string | null
) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();

    if (!subEventId || !userId || !role) {
      return { success: false, error: 'SubEvent ID, User ID, and Role are required.' };
    }

    // 1. Fetch target SubEvent and parent EventBooking
    const subEvent = await prisma.subEvent.findFirst({
      where: { id: subEventId, tenantId, deletedAt: null },
      include: {
        eventBooking: {
          select: { id: true, title: true, bookingNumber: true, branchId: true },
        },
      },
    });

    if (!subEvent) {
      return { success: false, error: 'SubEvent not found or unauthorized.' };
    }

    // 2. Fetch User details
    const crewUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!crewUser) {
      return { success: false, error: 'Selected crew member not found.' };
    }

    // 3. Strict Conflict Detection: Check for overlapping assignments on the same event date
    const conflictingAssignments = await prisma.staffAssignment.findMany({
      where: {
        tenantId,
        userId,
        deletedAt: null,
        subEventId: { not: subEventId },
        status: { in: [StaffAssignmentStatus.CONFIRMED, StaffAssignmentStatus.PENDING] },
        subEvent: {
          deletedAt: null,
          eventDate: subEvent.eventDate,
        },
      },
      include: {
        subEvent: {
          include: {
            eventBooking: {
              select: { title: true, bookingNumber: true },
            },
          },
        },
      },
    });

    if (conflictingAssignments.length > 0) {
      const conflictSummary = conflictingAssignments
        .map(
          (c) =>
            `"${c.subEvent.name}" on ${c.subEvent.eventBooking.title} (${c.subEvent.startTime} - ${c.subEvent.endTime})`
        )
        .join(', ');
      return {
        success: false,
        error: `Schedule Conflict: ${crewUser.name} is already assigned to ${conflictSummary} on this date.`,
      };
    }

    // 4. Atomic Execution via Prisma Transaction
    const eventDateTime = new Date(subEvent.eventDate).getTime();
    const tokenExpiresAt = new Date(eventDateTime + 48 * 60 * 60 * 1000);

    const assignment = await prisma.$transaction(async (tx) => {
      let parsedPayout: Prisma.Decimal | null = null;
      if (payoutAmount !== undefined && payoutAmount !== null && payoutAmount > 0) {
        parsedPayout = new Prisma.Decimal(payoutAmount);
      }

      // Upsert StaffAssignment
      const existing = await tx.staffAssignment.findFirst({
        where: { subEventId, userId, role, deletedAt: null },
      });

      let record;
      if (existing) {
        record = await tx.staffAssignment.update({
          where: { id: existing.id },
          data: {
            payoutAmount: parsedPayout ?? existing.payoutAmount,
            notes: notes?.trim() || existing.notes,
            status: StaffAssignmentStatus.CONFIRMED,
            assignedById: currentUserId,
            magicToken: existing.magicToken || crypto.randomBytes(24).toString('hex'),
            tokenExpiresAt,
            isTokenRevoked: false,
          },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true, designation: true } },
          },
        });
      } else {
        record = await tx.staffAssignment.create({
          data: {
            tenantId,
            subEventId,
            userId,
            role,
            payoutAmount: parsedPayout,
            notes: notes?.trim() || null,
            status: StaffAssignmentStatus.CONFIRMED,
            assignedById: currentUserId,
            magicToken: crypto.randomBytes(24).toString('hex'),
            tokenExpiresAt,
            isTokenRevoked: false,
          },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true, designation: true } },
          },
        });
      }

      // Ensure EventAssignment exists for top-level booking summaries
      const existingEventAssignment = await tx.eventAssignment.findFirst({
        where: {
          eventBookingId: subEvent.eventBookingId,
          userId,
          role,
        },
      });

      if (!existingEventAssignment) {
        await tx.eventAssignment.create({
          data: {
            eventBookingId: subEvent.eventBookingId,
            userId,
            role,
            assignedById: currentUserId,
          },
        });
      }

      return record;
    });

    revalidatePath(`/operations/bookings/${subEvent.eventBookingId}`);
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/dispatch');

    return {
      success: true,
      data: serializePrisma(assignment),
      message: `${crewUser.name} successfully assigned as ${role} for ${subEvent.name}.`,
    };
  } catch (error: any) {
    console.error('[ASSIGN_CREW_TO_SUBEVENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to assign crew member to function.',
    };
  }
}

export const assignCrewToSubEventAction = assignCrewToSubEvent;

/**
 * Removes or deallocates a crew member from a SubEvent.
 */
export async function removeCrewFromSubEvent(assignmentId: string) {
  try {
    const { tenantId } = await validateSession();

    const assignment = await prisma.staffAssignment.findFirst({
      where: { id: assignmentId, tenantId, deletedAt: null },
      include: {
        subEvent: { select: { id: true, eventBookingId: true, name: true } },
        user: { select: { name: true } },
      },
    });

    if (!assignment) {
      return { success: false, error: 'Staff assignment not found or unauthorized.' };
    }

    await prisma.staffAssignment.update({
      where: { id: assignment.id },
      data: {
        deletedAt: new Date(),
        isTokenRevoked: true,
      },
    });

    revalidatePath(`/operations/bookings/${assignment.subEvent.eventBookingId}`);
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/dispatch');

    return {
      success: true,
      message: `Unassigned ${assignment.user?.name || 'crew member'} from ${assignment.subEvent.name}.`,
    };
  } catch (error: any) {
    console.error('[REMOVE_CREW_FROM_SUBEVENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to remove crew assignment.',
    };
  }
}

export const removeCrewFromSubEventAction = removeCrewFromSubEvent;

/**
 * Reserves/allocates specific studio equipment to a SubEvent.
 * Detects inventory conflicts against overlapping shoot bookings.
 */
export async function assignGearToSubEvent(
  subEventId: string,
  equipmentId: string,
  notes?: string | null
) {
  try {
    const { tenantId, branchId } = await validateSession();

    if (!subEventId || !equipmentId) {
      return { success: false, error: 'SubEvent ID and Equipment ID are required.' };
    }

    // 1. Verify SubEvent & Parent Booking
    const subEvent = await prisma.subEvent.findFirst({
      where: { id: subEventId, tenantId, deletedAt: null },
      include: {
        eventBooking: {
          select: { id: true, branchId: true, title: true, startDate: true, endDate: true },
        },
      },
    });

    if (!subEvent) {
      return { success: false, error: 'SubEvent not found or unauthorized.' };
    }

    // 2. Verify Equipment
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, tenantId },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        modelNumber: true,
        serialNumber: true,
        status: true,
        branchId: true,
      },
    });

    if (!equipment) {
      return { success: false, error: 'Equipment not found in studio inventory.' };
    }

    if (
      equipment.status === AssetStatus.MAINTENANCE ||
      equipment.status === AssetStatus.RETIRED
    ) {
      return {
        success: false,
        error: `Equipment "${equipment.name}" is currently marked as ${equipment.status} and cannot be reserved.`,
      };
    }

    // 3. Conflict Detection: Check if gear is already allocated to another overlapping booking
    const conflictingAllocations = await prisma.shootGearAllocation.findMany({
      where: {
        tenantId,
        equipmentId,
        status: {
          in: [
            GearAllocationStatus.ALLOCATED,
            GearAllocationStatus.CHECKED_OUT,
            GearAllocationStatus.IN_FIELD,
          ],
        },
        eventBookingId: { not: subEvent.eventBookingId },
        eventBooking: {
          deletedAt: null,
          startDate: { lte: subEvent.eventBooking.endDate },
          endDate: { gte: subEvent.eventBooking.startDate },
        },
      },
      include: {
        eventBooking: { select: { title: true, bookingNumber: true, startDate: true, endDate: true } },
      },
    });

    if (conflictingAllocations.length > 0) {
      const conflictTitles = conflictingAllocations
        .map((c) => `"${c.eventBooking.title}" (#${c.eventBooking.bookingNumber})`)
        .join(', ');
      return {
        success: false,
        error: `Equipment Conflict: "${equipment.name}" is already reserved for overlapping shoot ${conflictTitles}.`,
      };
    }

    const targetBranchId = subEvent.eventBooking.branchId || equipment.branchId;

    // 4. Atomic Transaction: Create or update ShootGearAllocation
    const allocation = await prisma.$transaction(async (tx) => {
      const existing = await tx.shootGearAllocation.findFirst({
        where: {
          eventBookingId: subEvent.eventBookingId,
          subEventId,
          equipmentId,
        },
      });

      if (existing) {
        return tx.shootGearAllocation.update({
          where: { id: existing.id },
          data: {
            status: GearAllocationStatus.ALLOCATED,
            checkoutNotes: notes?.trim() || existing.checkoutNotes,
          },
          include: {
            equipment: true,
          },
        });
      }

      return tx.shootGearAllocation.create({
        data: {
          tenantId,
          branchId: targetBranchId,
          eventBookingId: subEvent.eventBookingId,
          subEventId,
          equipmentId,
          status: GearAllocationStatus.ALLOCATED,
          checkoutNotes: notes?.trim() || null,
        },
        include: {
          equipment: true,
        },
      });
    });

    revalidatePath(`/operations/bookings/${subEvent.eventBookingId}`);
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/inventory');

    return {
      success: true,
      data: serializePrisma(allocation),
      message: `"${equipment.name}" reserved for ${subEvent.name}.`,
    };
  } catch (error: any) {
    console.error('[ASSIGN_GEAR_TO_SUBEVENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to allocate equipment to function.',
    };
  }
}

export const assignGearToSubEventAction = assignGearToSubEvent;

/**
 * Deallocates or removes reserved equipment from a SubEvent.
 */
export async function removeGearFromSubEvent(allocationId: string) {
  try {
    const { tenantId } = await validateSession();

    const allocation = await prisma.shootGearAllocation.findFirst({
      where: { id: allocationId, tenantId },
      include: {
        subEvent: { select: { name: true } },
        equipment: { select: { name: true } },
      },
    });

    if (!allocation) {
      return { success: false, error: 'Equipment allocation record not found.' };
    }

    await prisma.shootGearAllocation.delete({
      where: { id: allocation.id },
    });

    revalidatePath(`/operations/bookings/${allocation.eventBookingId}`);
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/inventory');

    return {
      success: true,
      message: `Removed "${allocation.equipment.name}" from ${allocation.subEvent?.name || 'function'}.`,
    };
  } catch (error: any) {
    console.error('[REMOVE_GEAR_FROM_SUBEVENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to deallocate equipment.',
    };
  }
}

export const removeGearFromSubEventAction = removeGearFromSubEvent;

/**
 * Comprehensive data loader for the Unified Booking Command Center.
 */
export async function getBookingCommandCenterData(bookingId: string) {
  try {
    const { tenantId } = await validateSession();

    const [booking, availableCrew, availableGear, availableVehicles] = await Promise.all([
      prisma.eventBooking.findFirst({
        where: { id: bookingId, tenantId, deletedAt: null },
        include: {
          customer: true,
          tenant: true,
          branch: true,
          invoice: {
            include: {
              payments: {
                where: { status: 'SUCCESS' },
                orderBy: { paymentDate: 'desc' },
              },
            },
          },
          quotation: {
            include: {
              quotationRevisions: {
                orderBy: { revisionNumber: 'desc' },
                take: 1,
                include: { items: true },
              },
            },
          },
          subEvents: {
            where: { deletedAt: null },
            orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
            include: {
              staffAssignments: {
                where: { deletedAt: null },
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
              shootGearAllocations: {
                include: {
                  equipment: true,
                  assignedTo: {
                    select: { id: true, name: true },
                  },
                },
              },
              vehicleBookings: {
                where: { status: { not: 'CANCELLED' } },
                include: {
                  vehicle: {
                    select: {
                      id: true,
                      plateNumber: true,
                      makeModel: true,
                      type: true,
                      capacity: true,
                      driverName: true,
                      driverPhone: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { tenantId, deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          designation: true,
          employmentType: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.equipment.findMany({
        where: {
          tenantId,
          status: { in: [AssetStatus.AVAILABLE, AssetStatus.IN_USE] },
        },
        select: {
          id: true,
          name: true,
          category: true,
          brand: true,
          modelNumber: true,
          serialNumber: true,
          assetTag: true,
          status: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.vehicle.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: [AssetStatus.AVAILABLE, AssetStatus.IN_USE] },
        },
        select: {
          id: true,
          plateNumber: true,
          makeModel: true,
          type: true,
          capacity: true,
          driverName: true,
          driverPhone: true,
          status: true,
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { plateNumber: 'asc' },
      }),
    ]);

    if (!booking) {
      return { success: false, error: 'Booking not found or access denied.' };
    }

    // Lazy token backfill for assignments created prior to Phase 14.2
    for (const se of booking.subEvents) {
      for (const sa of se.staffAssignments) {
        if (!sa.magicToken) {
          const generatedToken = crypto.randomBytes(24).toString('hex');
          const tokenExpiresAt = new Date(new Date(se.eventDate).getTime() + 48 * 60 * 60 * 1000);
          await prisma.staffAssignment.update({
            where: { id: sa.id },
            data: {
              magicToken: generatedToken,
              tokenExpiresAt,
              isTokenRevoked: false,
            },
          });
          sa.magicToken = generatedToken;
          sa.tokenExpiresAt = tokenExpiresAt;
          sa.isTokenRevoked = false;
        }
      }
    }

    return {
      success: true,
      data: serializePrisma({
        booking,
        availableCrew,
        availableGear,
        availableVehicles,
      }),
    };
  } catch (error: any) {
    console.error('[GET_BOOKING_COMMAND_CENTER_DATA_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to load booking command center data.',
    };
  }
}
