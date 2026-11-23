'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { IngestionStatus, PayoutStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AccountingSyncService } from '@/services/accounting-sync.service';

/**
 * Validates active tenant user session and retrieves user & tenant context.
 */
async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session found.');
  }

  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

// -----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// -----------------------------------------------------------------------------

const logDataHandoverSchema = z.object({
  eventBookingId: z.string().uuid('Invalid Event Booking ID'),
  subEventId: z.string().uuid('Invalid Sub-Event ID').optional().nullable(),
  handedOverById: z.string().uuid('Select who handed over the raw media'),
  primaryStoragePath: z.string().min(2, 'Primary storage or NAS path is required'),
  backupStoragePath: z.string().optional().nullable(),
  totalSizeGb: z.coerce.number().min(0, 'Total size cannot be negative').optional().nullable(),
  ingestionNotes: z.string().optional().nullable(),
});

const verifyDataAndTriggerPayoutSchema = z.object({
  jobId: z.string().uuid('Invalid Data Ingestion Job ID'),
  verifiedSizeGb: z.coerce.number().min(0).optional().nullable(),
  backupStoragePath: z.string().optional().nullable(),
  verificationNotes: z.string().optional().nullable(),
});

const updateIngestionStatusSchema = z.object({
  jobId: z.string().uuid('Invalid Data Ingestion Job ID'),
  status: z.nativeEnum(IngestionStatus),
  notes: z.string().optional().nullable(),
});

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Fetches complete Data Ingestion Desk data:
 * - Active / Recent Bookings with crew roster
 * - Data Ingestion Jobs queue
 * - Active Team Members / Freelancers
 */
export async function getIngestionDeskDataAction() {
  try {
    const { tenantId } = await validateSession();

    const [bookings, jobs, teamMembers] = await Promise.all([
      // Bookings that have started, confirmed, or in progress
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'BLOCKED'] },
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
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
                      employmentType: true,
                    },
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
                  employmentType: true,
                },
              },
            },
          },
          dataIngestionJobs: {
            where: { deletedAt: null },
            include: {
              handedOverBy: { select: { id: true, name: true } },
              receivedBy: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
        take: 30,
      }),

      // Data Ingestion Jobs (Queue)
      prisma.dataIngestionJob.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        include: {
          eventBooking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              startDate: true,
              customer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          subEvent: {
            select: {
              id: true,
              name: true,
              eventDate: true,
            },
          },
          handedOverBy: {
            select: {
              id: true,
              name: true,
              phone: true,
              employmentType: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Team Members / Freelancers for assignment selection
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
          employmentType: true,
          designation: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: serializePrisma({
        bookings,
        jobs,
        teamMembers,
      }),
    };
  } catch (error: any) {
    console.error('[GET_INGESTION_DESK_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch Data Ingestion Desk data.',
    };
  }
}

/**
 * 2. Logs physical or digital raw media handover from a crew member/freelancer to the studio.
 * Creates a DataIngestionJob in PENDING or COPYING status.
 */
export async function logDataHandoverAction(input: z.infer<typeof logDataHandoverSchema>) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();
    const validated = logDataHandoverSchema.parse(input);

    // 1. Verify EventBooking belongs to tenant
    const booking = await prisma.eventBooking.findFirst({
      where: { id: validated.eventBookingId, tenantId, deletedAt: null },
      select: { id: true, title: true, bookingNumber: true },
    });

    if (!booking) {
      return { success: false, error: 'Target event booking not found or unauthorized.' };
    }

    // 2. Create the DataIngestionJob record
    const job = await prisma.dataIngestionJob.create({
      data: {
        tenantId,
        eventBookingId: validated.eventBookingId,
        subEventId: validated.subEventId || null,
        handedOverById: validated.handedOverById,
        receivedById: currentUserId,
        primaryStoragePath: validated.primaryStoragePath.trim(),
        backupStoragePath: validated.backupStoragePath?.trim() || null,
        totalSizeGb: validated.totalSizeGb ? Number(validated.totalSizeGb) : null,
        status: IngestionStatus.COPYING,
        ingestionNotes: validated.ingestionNotes?.trim() || null,
      },
      include: {
        eventBooking: { select: { bookingNumber: true, title: true } },
        handedOverBy: { select: { name: true } },
      },
    });

    revalidatePath('/operations/data-ingestion');
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    return {
      success: true,
      message: `Media handover logged from ${job.handedOverBy?.name || 'crew member'} for #${job.eventBooking.bookingNumber}.`,
      data: serializePrisma(job),
    };
  } catch (error: any) {
    console.error('[LOG_DATA_HANDOVER_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to log media handover.',
    };
  }
}

/**
 * 3. Verifies raw media integrity, marks DataIngestionJob as VERIFIED,
 * marks StaffAssignment as ELIGIBLE_FOR_PAYMENT, and posts the double-entry
 * accounting liability voucher via AccountingSyncService.
 */
export async function verifyDataAndTriggerPayoutAction(input: z.infer<typeof verifyDataAndTriggerPayoutSchema>) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();
    const validated = verifyDataAndTriggerPayoutSchema.parse(input);

    let voucherResult: any = null;

    // Execute atomic transaction for Data Verification + Payout Eligibility + Accounting Voucher
    const updatedJob = await prisma.$transaction(async (tx) => {
      // 1. Fetch Ingestion Job
      const job = await tx.dataIngestionJob.findFirst({
        where: { id: validated.jobId, tenantId, deletedAt: null },
        include: {
          eventBooking: true,
          subEvent: true,
          handedOverBy: true,
        },
      });

      if (!job) {
        throw new Error('Data ingestion job not found or unauthorized.');
      }

      // 2. Update Ingestion Job to VERIFIED
      const verifiedJob = await tx.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: IngestionStatus.VERIFIED,
          receivedById: currentUserId,
          backupStoragePath: validated.backupStoragePath?.trim() || job.backupStoragePath,
          totalSizeGb: validated.verifiedSizeGb !== undefined && validated.verifiedSizeGb !== null
            ? Number(validated.verifiedSizeGb)
            : job.totalSizeGb,
          ingestionNotes: validated.verificationNotes?.trim()
            ? `${job.ingestionNotes ? `${job.ingestionNotes}\n` : ''}[Verified]: ${validated.verificationNotes.trim()}`
            : job.ingestionNotes,
        },
      });

      // 3. Find matching assignment for the person who handed over the data
      if (job.handedOverById) {
        // A. Check sub-event specific StaffAssignment
        let targetStaffAssignment = null;
        if (job.subEventId) {
          targetStaffAssignment = await tx.staffAssignment.findFirst({
            where: {
              subEventId: job.subEventId,
              userId: job.handedOverById,
              deletedAt: null,
            },
          });
        }

        // B. Fallback to any staff assignment under this booking
        if (!targetStaffAssignment) {
          targetStaffAssignment = await tx.staffAssignment.findFirst({
            where: {
              subEvent: { eventBookingId: job.eventBookingId },
              userId: job.handedOverById,
              deletedAt: null,
            },
          });
        }

        // C. Check or create EventAssignment
        let targetEventAssignment = await tx.eventAssignment.findFirst({
          where: {
            eventBookingId: job.eventBookingId,
            userId: job.handedOverById,
          },
        });

        const effectiveAssignmentId = targetEventAssignment?.id || targetStaffAssignment?.id;

        if (effectiveAssignmentId) {
          // Trigger double-entry accounting voucher
          try {
            voucherResult = await AccountingSyncService.syncFreelancerPayoutToAccounts({
              assignmentId: effectiveAssignmentId,
              tenantId,
              userId: currentUserId,
              tx,
            });
          } catch (accErr: any) {
            console.warn('[ACC_SYNC_NOTICE]', accErr?.message);
            // Non-fatal if agreed payout was 0 or already synced
          }

          const voucherId = voucherResult?.voucher?.id || null;

          // Update StaffAssignment payoutStatus & voucherId
          if (targetStaffAssignment) {
            await tx.staffAssignment.update({
              where: { id: targetStaffAssignment.id },
              data: {
                payoutStatus: PayoutStatus.ELIGIBLE_FOR_PAYMENT,
                ...(voucherId ? { voucherId } : {}),
              },
            });
          }

          // Update EventAssignment payoutStatus & voucherId
          if (targetEventAssignment) {
            await tx.eventAssignment.update({
              where: { id: targetEventAssignment.id },
              data: {
                payoutStatus: PayoutStatus.ELIGIBLE_FOR_PAYMENT,
                ...(voucherId ? { voucherId } : {}),
              },
            });
          }
        }
      }

      return verifiedJob;
    });

    revalidatePath('/operations/data-ingestion');
    revalidatePath('/finance/vouchers');
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations');

    const voucherNumber = voucherResult?.voucher?.voucherNumber;

    return {
      success: true,
      message: voucherNumber
        ? `Media verified successfully! Finance journal voucher #${voucherNumber} posted and freelancer marked eligible for payout.`
        : 'Media verified successfully and marked eligible for payment.',
      data: serializePrisma(updatedJob),
    };
  } catch (error: any) {
    console.error('[VERIFY_DATA_PAYOUT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to verify media and trigger payout.',
    };
  }
}

/**
 * 4. Updates Ingestion Job status manually (e.g. mark CORRUPT, MISSING, or COPYING).
 */
export async function updateIngestionStatusAction(input: z.infer<typeof updateIngestionStatusSchema>) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();
    const validated = updateIngestionStatusSchema.parse(input);

    const job = await prisma.dataIngestionJob.findFirst({
      where: { id: validated.jobId, tenantId, deletedAt: null },
    });

    if (!job) {
      return { success: false, error: 'Data ingestion job not found or unauthorized.' };
    }

    const updated = await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: validated.status,
        receivedById: currentUserId,
        ingestionNotes: validated.notes?.trim()
          ? `${job.ingestionNotes ? `${job.ingestionNotes}\n` : ''}[${validated.status}]: ${validated.notes.trim()}`
          : job.ingestionNotes,
      },
    });

    revalidatePath('/operations/data-ingestion');
    return {
      success: true,
      message: `Job status updated to ${validated.status}.`,
      data: serializePrisma(updated),
    };
  } catch (error: any) {
    console.error('[UPDATE_INGESTION_STATUS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to update ingestion status.',
    };
  }
}
