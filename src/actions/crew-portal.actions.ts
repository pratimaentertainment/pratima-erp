'use server';

import { prisma } from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type CrewPassStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface CrewPassPreviewData {
  studioName: string;
  studioLogoUrl: string | null;
  eventTitle: string;
  functionName: string;
  eventDate: string;
  crewName: string;
  role: string;
  maskedPhone: string;
  hasPhone: boolean;
  expiresAt: string | null;
}

export interface SanitizedCrewPass {
  assignmentId: string;
  subEvent: {
    id: string;
    name: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    locationVenue: string | null;
    notes: string | null;
  };
  eventTitle: string;
  bookingNumber: string;
  role: string;
  crewName: string;
  crewPhone: string | null;
  studio: {
    name: string;
    logoUrl: string | null;
    coordinatorPhone: string | null;
    coordinatorEmail: string | null;
  };
  gear: Array<{
    id: string;
    name: string;
    category: string;
    serialNumber: string | null;
    assetTag: string | null;
    brand: string | null;
    model: string | null;
  }>;
  checkedInAt: string | null;
  mediaCardsCount: number | null;
  rawMediaSizeGb: number | null;
  fieldHandoverNotes: string | null;
}

const dataHandoverSchema = z.object({
  mediaCardsCount: z.coerce.number().int().min(1, 'At least 1 memory card is required'),
  rawMediaSizeGb: z.coerce.number().min(0, 'Media size cannot be negative').optional().nullable(),
  fieldHandoverNotes: z.string().max(1000, 'Handover notes cannot exceed 1000 characters').optional().nullable(),
});

/**
 * Validates the token and compares the 4-digit mobile verification PIN.
 * Throws a descriptive Error if token or PIN check fails.
 */
async function validatePassAccess(token: string, last4Digits?: string) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid event pass token.');
  }

  const assignment = await prisma.staffAssignment.findUnique({
    where: { magicToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      subEvent: {
        include: {
          eventBooking: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  tradeName: true,
                  logoUrl: true,
                  contactPhone: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          shootGearAllocations: {
            include: {
              equipment: {
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
              },
            },
          },
        },
      },
    },
  });

  if (
    !assignment ||
    assignment.deletedAt ||
    assignment.subEvent.deletedAt ||
    assignment.subEvent.eventBooking.deletedAt
  ) {
    throw new Error('This event pass does not exist or has been removed.');
  }

  if (assignment.isTokenRevoked) {
    throw new Error('This event pass has been revoked by studio management.');
  }

  if (assignment.tokenExpiresAt && new Date() > assignment.tokenExpiresAt) {
    throw new Error('This event pass has expired. Please contact your studio coordinator.');
  }

  if (last4Digits !== undefined) {
    const rawPhone = (assignment.user?.phone || '').replace(/\D/g, '');
    if (rawPhone.length < 4) {
      throw new Error(
        'No registered mobile number found for verification. Please contact your studio coordinator.'
      );
    }
    const expectedLast4 = rawPhone.slice(-4);
    const cleanInput = (last4Digits || '').replace(/\D/g, '').trim();
    if (cleanInput !== expectedLast4) {
      throw new Error(
        'Incorrect 4-digit mobile PIN. Please enter the last 4 digits of your registered phone number.'
      );
    }
  }

  return assignment;
}

/**
 * Publicly safe preliminary lookup.
 * Returns non-sensitive status & preview metadata so the UI can decide
 * whether to display the 4-digit PIN verification gate or an expiration/revocation message.
 */
export async function getCrewPassPreview(token: string): Promise<{
  success: boolean;
  status: CrewPassStatus;
  error?: string;
  data?: CrewPassPreviewData;
}> {
  try {
    if (!token || typeof token !== 'string') {
      return { success: false, status: 'INVALID', error: 'Invalid or missing pass token.' };
    }

    const assignment = await prisma.staffAssignment.findUnique({
      where: { magicToken: token },
      include: {
        user: { select: { name: true, phone: true } },
        subEvent: {
          include: {
            eventBooking: {
              include: {
                tenant: {
                  select: { name: true, tradeName: true, logoUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (
      !assignment ||
      assignment.deletedAt ||
      assignment.subEvent?.deletedAt ||
      assignment.subEvent?.eventBooking?.deletedAt
    ) {
      return { success: false, status: 'INVALID', error: 'Unrecognized or deleted event pass.' };
    }

    if (assignment.isTokenRevoked) {
      return {
        success: false,
        status: 'REVOKED',
        error: 'This event pass was revoked by studio management.',
      };
    }

    if (assignment.tokenExpiresAt && new Date() > assignment.tokenExpiresAt) {
      return {
        success: false,
        status: 'EXPIRED',
        error: `This event pass expired on ${new Date(assignment.tokenExpiresAt).toLocaleDateString('en-IN')}.`,
      };
    }

    const rawPhone = (assignment.user?.phone || '').replace(/\D/g, '');
    const maskedPhone =
      rawPhone.length >= 4 ? '••••••' + rawPhone.slice(-4) : '•••• (No Phone)';

    const tenant = assignment.subEvent.eventBooking.tenant;
    const studioName = tenant?.tradeName || tenant?.name || 'Studio Management';

    return {
      success: true,
      status: 'VALID',
      data: {
        studioName,
        studioLogoUrl: tenant?.logoUrl || null,
        eventTitle: assignment.subEvent.eventBooking.title,
        functionName: assignment.subEvent.name,
        eventDate: assignment.subEvent.eventDate.toISOString(),
        crewName: assignment.user?.name || 'Crew Member',
        role: assignment.role.replace(/_/g, ' '),
        maskedPhone,
        hasPhone: Boolean(rawPhone.length >= 4),
        expiresAt: assignment.tokenExpiresAt?.toISOString() || null,
      },
    };
  } catch (err: any) {
    console.error('[getCrewPassPreview Error]', err);
    return {
      success: false,
      status: 'INVALID',
      error: 'An unexpected error occurred while validating pass.',
    };
  }
}

/**
 * Authenticates the 4-digit mobile verification PIN and unlocks the complete Event Pass.
 * Strictly sanitizes data: NEVER returns financial totals, client budgets, or invoices.
 */
export async function verifyCrewPassPin(
  token: string,
  last4Digits: string
): Promise<{ success: boolean; error?: string; data?: SanitizedCrewPass }> {
  try {
    const assignment = await validatePassAccess(token, last4Digits);
    const subEvent = assignment.subEvent;
    const booking = subEvent.eventBooking;
    const tenant = booking.tenant;

    const sanitizedGear = (subEvent.shootGearAllocations || []).map((ga) => ({
      id: ga.equipment.id,
      name: ga.equipment.name,
      category: ga.equipment.category,
      serialNumber: ga.equipment.serialNumber,
      assetTag: ga.equipment.assetTag,
      brand: ga.equipment.brand,
      model: ga.equipment.modelNumber,
    }));

    const sanitizedPass: SanitizedCrewPass = {
      assignmentId: assignment.id,
      subEvent: {
        id: subEvent.id,
        name: subEvent.name,
        eventDate: subEvent.eventDate.toISOString(),
        startTime: subEvent.startTime,
        endTime: subEvent.endTime,
        locationVenue: subEvent.locationVenue,
        notes: subEvent.notes,
      },
      eventTitle: booking.title,
      bookingNumber: booking.bookingNumber,
      role: assignment.role.replace(/_/g, ' '),
      crewName: assignment.user?.name || 'Crew Member',
      crewPhone: assignment.user?.phone || null,
      studio: {
        name: tenant?.tradeName || tenant?.name || 'Studio Management',
        logoUrl: tenant?.logoUrl || null,
        coordinatorPhone: tenant?.contactPhone || tenant?.phone || null,
        coordinatorEmail: tenant?.email || null,
      },
      gear: sanitizedGear,
      checkedInAt: assignment.checkedInAt?.toISOString() || null,
      mediaCardsCount: assignment.mediaCardsCount,
      rawMediaSizeGb: assignment.rawMediaSizeGb,
      fieldHandoverNotes: assignment.fieldHandoverNotes,
    };

    return {
      success: true,
      data: serializePrisma(sanitizedPass),
    };
  } catch (err: any) {
    console.warn('[verifyCrewPassPin Rejection]', err.message);
    return {
      success: false,
      error: err.message || 'Verification failed. Please check your PIN.',
    };
  }
}

/**
 * Records on-location venue arrival timestamp for the crew member.
 */
export async function markCrewVenueCheckIn(
  token: string,
  last4Digits: string
): Promise<{ success: boolean; error?: string; message?: string; checkedInAt?: string }> {
  try {
    const assignment = await validatePassAccess(token, last4Digits);

    const now = new Date();
    await prisma.staffAssignment.update({
      where: { id: assignment.id },
      data: {
        checkedInAt: now,
      },
    });

    revalidatePath(`/portal/crew/${token}`);
    revalidatePath(`/operations/bookings/${assignment.subEvent.eventBookingId}`);
    revalidatePath('/operations/dispatch');

    return {
      success: true,
      message: 'Venue check-in successfully recorded!',
      checkedInAt: now.toISOString(),
    };
  } catch (err: any) {
    console.error('[markCrewVenueCheckIn Error]', err);
    return {
      success: false,
      error: err.message || 'Failed to record venue check-in.',
    };
  }
}

/**
 * Submits post-shoot memory cards count and data handover notes.
 */
export async function submitCrewDataHandover(
  token: string,
  last4Digits: string,
  payload: unknown
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const assignment = await validatePassAccess(token, last4Digits);

    const parseResult = dataHandoverSchema.safeParse(payload);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid handover data.',
      };
    }

    const { mediaCardsCount, rawMediaSizeGb, fieldHandoverNotes } = parseResult.data;

    await prisma.staffAssignment.update({
      where: { id: assignment.id },
      data: {
        mediaCardsCount,
        rawMediaSizeGb: rawMediaSizeGb ?? null,
        fieldHandoverNotes: fieldHandoverNotes?.trim() || null,
      },
    });

    revalidatePath(`/portal/crew/${token}`);
    revalidatePath(`/operations/bookings/${assignment.subEvent.eventBookingId}`);
    revalidatePath('/operations/data-ingestion');

    return {
      success: true,
      message: 'Post-shoot media handover details recorded successfully!',
    };
  } catch (err: any) {
    console.error('[submitCrewDataHandover Error]', err);
    return {
      success: false,
      error: err.message || 'Failed to submit data handover.',
    };
  }
}
