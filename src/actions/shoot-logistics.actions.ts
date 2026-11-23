'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { formatDate, formatDateTime } from '@/lib/date';
import {
  GearAllocationStatus,
  DispatchStatus,
  StaffAssignmentStatus,
  AssetStatus,
  Prisma,
} from '@prisma/client';
import { z } from 'zod';
import {
  checkoutGearAction as executeCheckoutGearAction,
  checkinGearAction as executeCheckinGearAction,
  type CheckoutGearInput,
  type CheckinGearInput,
} from '@/actions/dispatch.actions';

/**
 * Validates active tenant user session and retrieves user & tenant context.
 */
async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session found.');
  }

  // Resolve branch ID from user session or tenant default branch
  let branchId = user.activeBranchId || user.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    branchId = branch?.id;
  }

  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
    branchId: branchId as string,
  };
}

// -----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// -----------------------------------------------------------------------------

const bookingIdSchema = z.string().uuid('Invalid Event Booking ID');

const allocateGearSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID'),
  subEventId: z.string().uuid('Invalid Sub-Event ID').optional().nullable(),
  equipmentIds: z.array(z.string().uuid()).min(1, 'Select at least one equipment item'),
  assignedToUserId: z.string().uuid('Invalid crew user ID').optional().nullable(),
  checkoutNotes: z.string().optional().nullable(),
});

const assignCrewToSubEventSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID'),
  subEventId: z.string().uuid('Invalid Sub-Event ID'),
  userId: z.string().uuid('Invalid crew user ID'),
  role: z.string().min(2, 'Role must be at least 2 characters'),
  payoutAmount: z.union([z.number().min(0), z.string(), z.null()]).optional(),
  notes: z.string().optional().nullable(),
  expectedGearList: z.string().optional().nullable(),
});

const generateAndDispatchCallSheetSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID'),
  subEventId: z.string().uuid('Invalid Sub-Event ID').optional().nullable(),
  callTime: z.union([z.string(), z.date()]),
  reportingVenue: z.string().min(2, 'Reporting venue is required'),
  googleMapsLink: z.string().optional().nullable(),
  dressCode: z.string().optional().nullable(),
  specialNotes: z.string().optional().nullable(),
  leadDirectorId: z.string().uuid('Invalid director user ID').optional().nullable(),
  targetCrewUserIds: z.array(z.string().uuid()).optional(),
});

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Fetches complete shoot logistics context for a booking:
 * Event details, sub-events, assigned staff, allocated gear, and call sheets.
 */
export async function getShootLogisticsDetailsAction(bookingId: string) {
  try {
    const { tenantId } = await validateSession();
    const cleanBookingId = bookingIdSchema.parse(bookingId);

    const booking = await prisma.eventBooking.findFirst({
      where: {
        id: cleanBookingId,
        tenantId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        subEvents: {
          where: { deletedAt: null },
          include: {
            staffAssignments: {
              where: { deletedAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    designation: true,
                    skills: true,
                    employmentType: true,
                  },
                },
                assignedBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            shootGearAllocations: {
              include: {
                equipment: true,
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            callSheets: {
              include: {
                leadDirector: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
                dispatchLogs: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                  orderBy: { sentAt: 'desc' },
                },
              },
            },
          },
          orderBy: { eventDate: 'asc' },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                designation: true,
                employmentType: true,
              },
            },
            assignedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        shootGearAllocations: {
          include: {
            equipment: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            subEvent: {
              select: {
                id: true,
                name: true,
                eventDate: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        callSheets: {
          include: {
            leadDirector: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            dispatchLogs: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { sentAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'Event booking not found or unauthorized.' };
    }

    // Also fetch available active equipment and team members for quick assignment
    const [availableEquipment, teamMembers] = await Promise.all([
      prisma.equipment.findMany({
        where: {
          tenantId,
          status: { not: AssetStatus.RETIRED },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          designation: true,
          employmentType: true,
          monthlySalary: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: serializePrisma({
        booking,
        availableEquipment,
        teamMembers,
      }),
    };
  } catch (error: any) {
    console.error('[GET_SHOOT_LOGISTICS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch shoot logistics details.',
    };
  }
}

/**
 * 2. Allocates selected gear/equipment items to an event booking and optional sub-event.
 * Performs overlap conflict checking before creating allocation records.
 */
export async function allocateGearToShootAction(data: z.infer<typeof allocateGearSchema>) {
  try {
    const { tenantId, branchId } = await validateSession();
    const validated = allocateGearSchema.parse(data);

    // 1. Verify target booking exists and belongs to tenant
    const booking = await prisma.eventBooking.findFirst({
      where: { id: validated.bookingId, tenantId, deletedAt: null },
      select: { id: true, branchId: true, startDate: true, endDate: true, title: true },
    });

    if (!booking) {
      return { success: false, error: 'Target event booking not found or unauthorized.' };
    }

    const effectiveBranchId = booking.branchId || branchId;

    // 2. Validate equipment availability & detect date conflicts with overlapping shoots
    const conflictingAllocations = await prisma.shootGearAllocation.findMany({
      where: {
        tenantId,
        equipmentId: { in: validated.equipmentIds },
        status: { in: [GearAllocationStatus.ALLOCATED, GearAllocationStatus.CHECKED_OUT, GearAllocationStatus.IN_FIELD] },
        eventBookingId: { not: booking.id },
        eventBooking: {
          deletedAt: null,
          startDate: { lte: booking.endDate },
          endDate: { gte: booking.startDate },
        },
      },
      include: {
        equipment: { select: { name: true, serialNumber: true } },
        eventBooking: { select: { title: true, bookingNumber: true, startDate: true, endDate: true } },
      },
    });

    if (conflictingAllocations.length > 0) {
      const conflictNames = conflictingAllocations
        .map((c) => `${c.equipment.name} (${c.equipment.serialNumber || 'N/A'}) on "${c.eventBooking.title}"`)
        .join(', ');
      return {
        success: false,
        error: `Equipment conflict detected: The following gear is already allocated to overlapping shoots: ${conflictNames}`,
      };
    }

    // 3. Create allocation records in a transaction
    const createdAllocations = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const eqId of validated.equipmentIds) {
        // Check if this equipment is already allocated for this specific booking
        const existing = await tx.shootGearAllocation.findFirst({
          where: {
            eventBookingId: booking.id,
            equipmentId: eqId,
            subEventId: validated.subEventId || null,
          },
        });

        if (existing) {
          // Update existing allocation
          const updated = await tx.shootGearAllocation.update({
            where: { id: existing.id },
            data: {
              assignedToId: validated.assignedToUserId || null,
              checkoutNotes: validated.checkoutNotes || null,
              status: GearAllocationStatus.ALLOCATED,
            },
            include: { equipment: true, assignedTo: true },
          });
          results.push(updated);
        } else {
          // Create new allocation
          const created = await tx.shootGearAllocation.create({
            data: {
              tenantId,
              branchId: effectiveBranchId,
              eventBookingId: booking.id,
              subEventId: validated.subEventId || null,
              equipmentId: eqId,
              assignedToId: validated.assignedToUserId || null,
              status: GearAllocationStatus.ALLOCATED,
              checkoutNotes: validated.checkoutNotes || null,
            },
            include: { equipment: true, assignedTo: true },
          });
          results.push(created);
        }
      }

      return results;
    });

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(createdAllocations),
    };
  } catch (error: any) {
    console.error('[ALLOCATE_GEAR_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to allocate equipment to shoot.',
    };
  }
}

/**
 * Deallocates or removes a piece of gear from a shoot allocation.
 */
export async function deallocateGearFromShootAction(allocationId: string) {
  try {
    const { tenantId } = await validateSession();
    if (!allocationId) throw new Error('Allocation ID is required');

    const allocation = await prisma.shootGearAllocation.findFirst({
      where: { id: allocationId, tenantId },
    });

    if (!allocation) {
      return { success: false, error: 'Gear allocation record not found.' };
    }

    await prisma.shootGearAllocation.delete({
      where: { id: allocationId },
    });

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return { success: true, message: 'Gear deallocated from shoot successfully.' };
  } catch (error: any) {
    console.error('[DEALLOCATE_GEAR_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to deallocate equipment.',
    };
  }
}

/**
 * 3. Assigns a crew member to a specific sub-event function with role and payout amount.
 * Synchronizes with parent event assignments automatically.
 */
export async function assignCrewToSubEventAction(data: z.infer<typeof assignCrewToSubEventSchema>) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();
    const validated = assignCrewToSubEventSchema.parse(data);

    // 1. Verify sub-event exists and belongs to this tenant and booking
    const subEvent = await prisma.subEvent.findFirst({
      where: {
        id: validated.subEventId,
        eventBookingId: validated.bookingId,
        tenantId,
        deletedAt: null,
      },
      include: {
        eventBooking: {
          select: { id: true, title: true, bookingNumber: true },
        },
      },
    });

    if (!subEvent) {
      return { success: false, error: 'Sub-event not found or unauthorized.' };
    }

    // 2. Parse payout amount if provided
    let parsedPayout: Prisma.Decimal | null = null;
    if (validated.payoutAmount !== undefined && validated.payoutAmount !== null && validated.payoutAmount !== '') {
      const num = Number(validated.payoutAmount);
      if (!isNaN(num) && num >= 0) {
        parsedPayout = new Prisma.Decimal(num);
      }
    }

    // 3. Upsert staff assignment for this sub-event with audit trail
    const existingAssignment = await prisma.staffAssignment.findFirst({
      where: {
        subEventId: validated.subEventId,
        userId: validated.userId,
        role: validated.role,
        deletedAt: null,
      },
    });

    let assignment;
    if (existingAssignment) {
      assignment = await prisma.staffAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          payoutAmount: parsedPayout,
          notes: validated.notes || null,
          expectedGearList: validated.expectedGearList?.trim() || null,
          status: StaffAssignmentStatus.CONFIRMED,
          assignedById: currentUserId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              designation: true,
              employmentType: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      assignment = await prisma.staffAssignment.create({
        data: {
          tenantId,
          subEventId: validated.subEventId,
          userId: validated.userId,
          role: validated.role,
          payoutAmount: parsedPayout,
          notes: validated.notes || null,
          expectedGearList: validated.expectedGearList?.trim() || null,
          status: StaffAssignmentStatus.CONFIRMED,
          assignedById: currentUserId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              designation: true,
              employmentType: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    // 4. Also ensure top-level EventAssignment exists for backward compatibility and overview rollups
    const existingEventAssignment = await prisma.eventAssignment.findFirst({
      where: {
        eventBookingId: validated.bookingId,
        userId: validated.userId,
        role: validated.role,
      },
    });

    if (!existingEventAssignment) {
      await prisma.eventAssignment.create({
        data: {
          eventBookingId: validated.bookingId,
          userId: validated.userId,
          role: validated.role,
          agreedPayment: parsedPayout,
          notes: validated.notes || null,
          expectedGearList: validated.expectedGearList?.trim() || null,
          assignedById: currentUserId,
        },
      });
    } else {
      await prisma.eventAssignment.update({
        where: { id: existingEventAssignment.id },
        data: {
          agreedPayment: parsedPayout,
          notes: validated.notes || null,
          expectedGearList: validated.expectedGearList?.trim() || null,
          assignedById: currentUserId,
        },
      });
    }

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma(assignment),
    };
  } catch (error: any) {
    console.error('[ASSIGN_CREW_SUBEVENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to assign crew member to sub-event.',
    };
  }
}

/**
 * 4. Generates or updates a Call Sheet for a shoot, renders a formatted WhatsApp
 * Markdown template, and records dispatch logs in the DispatchLog audit table.
 */
export async function generateAndDispatchCallSheetAction(data: z.infer<typeof generateAndDispatchCallSheetSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = generateAndDispatchCallSheetSchema.parse(data);

    // 1. Fetch complete event booking data with relations
    const booking = await prisma.eventBooking.findFirst({
      where: { id: validated.bookingId, tenantId, deletedAt: null },
      include: {
        tenant: true,
        customer: true,
        subEvents: {
          where: { deletedAt: null },
          include: {
            staffAssignments: {
              where: { deletedAt: null },
              include: { user: true },
            },
          },
        },
        assignments: {
          include: { user: true },
        },
        shootGearAllocations: {
          include: { equipment: true, assignedTo: true },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'Event booking not found or unauthorized.' };
    }

    const studioName =
      booking.tenant?.tradeName ||
      booking.tenant?.companyLegalName ||
      booking.tenant?.name ||
      'Pratima Photography Studio';

    const parsedCallTime = new Date(validated.callTime);

    // 2. Upsert CallSheet record
    const existingCallSheet = await prisma.callSheet.findFirst({
      where: {
        eventBookingId: booking.id,
        subEventId: validated.subEventId || null,
      },
    });

    let callSheet;
    if (existingCallSheet) {
      callSheet = await prisma.callSheet.update({
        where: { id: existingCallSheet.id },
        data: {
          callTime: parsedCallTime,
          reportingVenue: validated.reportingVenue.trim(),
          googleMapsLink: validated.googleMapsLink?.trim() || null,
          dressCode: validated.dressCode?.trim() || 'All Black Professional',
          specialNotes: validated.specialNotes?.trim() || null,
          leadDirectorId: validated.leadDirectorId || null,
        },
        include: { leadDirector: true },
      });
    } else {
      callSheet = await prisma.callSheet.create({
        data: {
          tenantId,
          eventBookingId: booking.id,
          subEventId: validated.subEventId || null,
          callTime: parsedCallTime,
          reportingVenue: validated.reportingVenue.trim(),
          googleMapsLink: validated.googleMapsLink?.trim() || null,
          dressCode: validated.dressCode?.trim() || 'All Black Professional',
          specialNotes: validated.specialNotes?.trim() || null,
          leadDirectorId: validated.leadDirectorId || null,
        },
        include: { leadDirector: true },
      });
    }

    // 3. Compile Crew List with BYOG & Employment Types
    interface CrewDetails {
      name: string;
      role: string;
      phone: string;
      employmentType: string | null;
      expectedGearList: string | null;
    }

    const crewMap = new Map<string, CrewDetails>();

    // If sub-event specified, prioritize sub-event staff
    if (validated.subEventId) {
      const targetSub = booking.subEvents.find((s) => s.id === validated.subEventId);
      targetSub?.staffAssignments.forEach((sa) => {
        if (sa.user) {
          crewMap.set(sa.user.id, {
            name: sa.user.name || 'Crew Member',
            role: sa.role,
            phone: sa.user.phone || '',
            employmentType: sa.user.employmentType || null,
            expectedGearList: sa.expectedGearList || null,
          });
        }
      });
    } else {
      // General booking level assignments
      booking.assignments.forEach((asg) => {
        if (asg.user) {
          crewMap.set(asg.user.id, {
            name: asg.user.name || 'Crew Member',
            role: asg.role,
            phone: asg.user.phone || '',
            employmentType: asg.user.employmentType || null,
            expectedGearList: asg.expectedGearList || null,
          });
        }
      });

      // Also include sub-event crew if not in top-level
      booking.subEvents.forEach((sub) => {
        sub.staffAssignments.forEach((sa) => {
          if (sa.user && !crewMap.has(sa.user.id)) {
            crewMap.set(sa.user.id, {
              name: sa.user.name || 'Crew Member',
              role: sa.role,
              phone: sa.user.phone || '',
              employmentType: sa.user.employmentType || null,
              expectedGearList: sa.expectedGearList || null,
            });
          }
        });
      });
    }

    const crewListFormatted =
      crewMap.size > 0
        ? Array.from(crewMap.values())
            .map((c) => `  • *${c.role}:* ${c.name} (${c.phone || 'No Phone'})`)
            .join('\n')
        : '  • _No crew assigned yet_';

    // 4. Compile Studio Gear Packing List
    const gearListFormatted =
      booking.shootGearAllocations.length > 0
        ? booking.shootGearAllocations
            .map((g) => {
              const assignedName = g.assignedTo?.name ? ` [Custodian: ${g.assignedTo.name}]` : '';
              return `  • *${g.equipment.name}* (${g.equipment.brand || ''} ${g.equipment.modelNumber || ''})${assignedName}`;
            })
            .join('\n')
        : '  • _Standard studio kit_';

    // Compile BYOG Checklist across freelancers
    const byogCrewMembers = Array.from(crewMap.values()).filter(
      (c) => c.expectedGearList && c.expectedGearList.trim()
    );

    const byogSummaryFormatted =
      byogCrewMembers.length > 0
        ? byogCrewMembers
            .map((c) => {
              const items = c.expectedGearList!
                .trim()
                .split('\n')
                .map((l) => {
                  const t = l.trim();
                  return t.startsWith('•') || t.startsWith('-') ? `    ${t}` : `    - ${t}`;
                })
                .join('\n');
              return `  • *${c.name} (${c.role} - BYOG):*\n${items}`;
            })
            .join('\n')
        : null;

    // 5. Construct Clean WhatsApp Markdown Template
    const clientName = `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Valued Client';
    const clientPhone = booking.customer?.phone || 'N/A';
    const shootDateFormatted = formatDate(booking.startDate, 'dd MMMM yyyy');
    const callTimeFormatted = formatDateTime(parsedCallTime, 'hh:mm a (dd/MM/yyyy)');

    const whatsappMessage = `🎬 *${studioName.toUpperCase()} — SHOOT CALL SHEET*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Shoot / Event:* ${booking.title} (${booking.bookingNumber})
👤 *Client Contact:* ${clientName} (${clientPhone})
📅 *Shoot Date:* ${shootDateFormatted}
⏰ *Exact Call Time:* ${callTimeFormatted}
📍 *Reporting Venue:* ${callSheet.reportingVenue}
🗺️ *GPS Navigation:* ${callSheet.googleMapsLink || 'Shared upon arrival'}
👔 *Dress Code:* ${callSheet.dressCode || 'All Black Professional'}
🎬 *Lead Director:* ${callSheet.leadDirector?.name || 'Studio Production Desk'}

👥 *CREW ROSTER:*
${crewListFormatted}
${
  byogSummaryFormatted
    ? `\n🎒 *REQUIRED GEAR TO BRING (BYOG):*\n${byogSummaryFormatted}\n`
    : ''
}
📦 *STUDIO GEAR TO DISPATCH / COLLECT:*
${gearListFormatted}

⚠️ *Notes:* ${callSheet.specialNotes || 'Arrive 30 mins prior to call time. Ensure dual card backups.'}
━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via Pratima ERP Shoot Logistics_`;

    // 6. Generate Direct Click-to-Chat WhatsApp URLs and log in DispatchLog
    const targetIds = validated.targetCrewUserIds && validated.targetCrewUserIds.length > 0
      ? validated.targetCrewUserIds
      : Array.from(crewMap.keys());

    const directWhatsAppUrls: Array<{ userId: string; name: string; phone: string; url: string }> = [];

    for (const userId of targetIds) {
      const crew = crewMap.get(userId);
      if (!crew || !crew.phone) continue;

      let cleanPhone = crew.phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = `91${cleanPhone.slice(1)}`;
      }

      const isFreelancer =
        crew.employmentType === 'FREELANCE' || crew.employmentType === 'FREELANCER';
      const hasByog = Boolean(crew.expectedGearList && crew.expectedGearList.trim());

      // Tailored Gear Section for this specific crew recipient:
      let tailoredGearSection = '';

      if (hasByog) {
        const byogLines = crew.expectedGearList!
          .trim()
          .split('\n')
          .map((l) => {
            const t = l.trim();
            return t.startsWith('•') || t.startsWith('-') ? `  ${t}` : `  - ${t}`;
          })
          .join('\n');
        tailoredGearSection += `🎒 *Required Gear to Bring (BYOG):*\n${byogLines}\n\n`;
      } else if (isFreelancer) {
        tailoredGearSection += `🎒 *Required Gear to Bring (BYOG):*\n  - Standard professional ${crew.role} kit & backup cards\n\n`;
      }

      // Check if any studio gear was specifically assigned to this user
      const userStudioGear = booking.shootGearAllocations.filter(
        (g) => g.assignedToId === userId
      );

      if (userStudioGear.length > 0) {
        tailoredGearSection += `📦 *Studio Gear to Collect:*\n${userStudioGear
          .map((g) => `  • *${g.equipment.name}* (${g.equipment.brand || ''} ${g.equipment.modelNumber || ''})`)
          .join('\n')}`;
      } else if (hasByog || isFreelancer) {
        tailoredGearSection += `📦 *Studio Gear to Collect:* None (Self-Equipped as contracted above)`;
      } else {
        tailoredGearSection += `📦 *Studio Gear to Collect:*\n${gearListFormatted}`;
      }

      const recipientPersonalMessage = `🎬 *${studioName.toUpperCase()} — SHOOT CALL SHEET*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Shoot / Event:* ${booking.title} (${booking.bookingNumber})
👤 *Client Contact:* ${clientName} (${clientPhone})
📅 *Shoot Date:* ${shootDateFormatted}
⏰ *Exact Call Time:* ${callTimeFormatted}
📍 *Reporting Venue:* ${callSheet.reportingVenue}
🗺️ *GPS Navigation:* ${callSheet.googleMapsLink || 'Shared upon arrival'}
👔 *Dress Code:* ${callSheet.dressCode || 'All Black Professional'}
🎬 *Lead Director:* ${callSheet.leadDirector?.name || 'Studio Production Desk'}
🎯 *Your Role:* ${crew.role}

👥 *CREW ROSTER:*
${crewListFormatted}

${tailoredGearSection}

⚠️ *Notes:* ${callSheet.specialNotes || 'Arrive 30 mins prior to call time. Ensure dual card backups.'}
━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via Pratima ERP Shoot Logistics_`;

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(recipientPersonalMessage)}`;
      directWhatsAppUrls.push({
        userId,
        name: crew.name,
        phone: cleanPhone,
        url: waUrl,
      });

      // Write immutable dispatch audit log
      await prisma.dispatchLog.create({
        data: {
          tenantId,
          callSheetId: callSheet.id,
          userId,
          channel: 'WHATSAPP',
          phone: cleanPhone,
          message: recipientPersonalMessage,
          status: DispatchStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      data: serializePrisma({
        callSheet,
        whatsappMessage,
        directWhatsAppUrls,
        dispatchesCount: directWhatsAppUrls.length,
      }),
    };
  } catch (error: any) {
    console.error('[GENERATE_CALL_SHEET_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to generate and dispatch call sheet.',
    };
  }
}

/**
 * 5. Fetches all upcoming confirmed and blocked shoots with quick allocation indicators.
 */
export async function getUpcomingShootsAction() {
  try {
    const { tenantId } = await validateSession();
    const bookings = await prisma.eventBooking.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'BLOCKED'] },
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        subEvents: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            eventDate: true,
            startTime: true,
            endTime: true,
            locationVenue: true,
            staffAssignments: {
              where: { deletedAt: null },
              select: { id: true, role: true, userId: true, payoutAmount: true, assignedById: true },
            },
            shootGearAllocations: {
              select: { id: true, equipmentId: true },
            },
          },
          orderBy: { eventDate: 'asc' },
        },
        assignments: {
          select: { id: true, role: true, userId: true },
        },
        shootGearAllocations: {
          select: { id: true, equipmentId: true, status: true },
        },
        callSheets: {
          select: { id: true, callTime: true, reportingVenue: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return { success: true, data: serializePrisma(bookings) };
  } catch (error: any) {
    console.error('[GET_UPCOMING_SHOOTS_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to fetch upcoming shoots' };
  }
}

/**
 * 6. Unassigns / removes a crew member from a sub-event function.
 */
export async function unassignCrewFromSubEventAction(assignmentId: string) {
  try {
    const { tenantId } = await validateSession();
    if (!assignmentId) throw new Error('Assignment ID is required');

    const assignment = await prisma.staffAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });

    if (!assignment) {
      return { success: false, error: 'Staff assignment record not found.' };
    }

    await prisma.staffAssignment.update({
      where: { id: assignmentId },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return { success: true, message: 'Crew member unassigned successfully.' };
  } catch (error: any) {
    console.error('[UNASSIGN_CREW_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to unassign crew member.' };
  }
}

/**
 * 7. Dispatches & checks out gear for a shoot (forwards to configurable dispatch engine).
 */
export async function checkoutGearAction(input: CheckoutGearInput) {
  return executeCheckoutGearAction(input);
}

/**
 * 8. Checks in & returns gear from a shoot (forwards to configurable dispatch engine).
 */
export async function checkinGearAction(input: CheckinGearInput) {
  return executeCheckinGearAction(input);
}
