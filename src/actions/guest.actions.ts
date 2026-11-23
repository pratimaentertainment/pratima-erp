'use server';

import { prisma } from '@/lib/prisma';
import { guestLeadSchema, type GuestLeadFormValues } from '@/schemas/guest-lead.schema';
import { formatWhatsAppPhone } from '@/utils/whatsapp.utils';
import { EventBookingStatus } from '@prisma/client';

export interface SubmitGuestLeadResult {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    guestName: string;
    whatsappNumber: string;
    eventTitle?: string;
  };
}

/**
 * Server action to securely register a guest lead with selfie reference for AI face matching.
 * Validates tenant existence, event correlation, and Indian mobile numbering rules.
 */
export async function submitGuestLeadAction(
  data: GuestLeadFormValues,
  tenantId: string
): Promise<SubmitGuestLeadResult> {
  try {
    if (!tenantId) {
      return { success: false, error: 'Studio identifier is missing' };
    }

    // 1. Validate Tenant existence
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        isAIGuestPortalEnabled: true,
      },
    });

    if (!tenant) {
      return { success: false, error: 'Photography studio not found or invalid' };
    }

    // 2. Validate input schema with Zod
    const validationResult = guestLeadSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Invalid form submission';
      return { success: false, error: firstError };
    }

    const { bookingId, guestName, whatsappNumber, selfieImage } = validationResult.data;

    // 3. Normalize WhatsApp Number (+91 format)
    const cleanPhone = formatWhatsAppPhone(whatsappNumber);
    if (!cleanPhone) {
      return { success: false, error: 'Invalid WhatsApp phone number' };
    }

    // 4. Validate Event Booking correlation (if provided)
    let validatedBookingId: string | null = null;
    let eventTitle: string | undefined = undefined;

    if (bookingId && bookingId.trim().length > 0) {
      const booking = await prisma.eventBooking.findFirst({
        where: {
          id: bookingId,
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
        },
        select: {
          id: true,
          title: true,
          bookingNumber: true,
        },
      });

      if (booking) {
        validatedBookingId = booking.id;
        eventTitle = booking.title;
      }
    }

    // 5. Securely persist Guest Lead into PostgreSQL
    const guestLead = await prisma.guestLead.create({
      data: {
        tenantId,
        bookingId: validatedBookingId,
        guestName: guestName.trim(),
        whatsappNumber: cleanPhone,
        selfieImageUrl: selfieImage,
        isMatched: false,
        matchedPhotosCount: 0,
      },
    });

    return {
      success: true,
      data: {
        id: guestLead.id,
        guestName: guestLead.guestName,
        whatsappNumber: guestLead.whatsappNumber,
        eventTitle,
      },
    };
  } catch (error: any) {
    console.error('[GuestAction] submitGuestLeadAction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit guest details. Please try again.',
    };
  }
}

/**
 * Server action to fetch active and recent events for a tenant.
 */
export async function getTenantActiveEventsAction(tenantId: string) {
  try {
    if (!tenantId) {
      return { success: false, error: 'Tenant ID required', data: [] };
    }

    const events = await prisma.eventBooking.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { not: EventBookingStatus.CANCELLED },
      },
      select: {
        id: true,
        title: true,
        bookingNumber: true,
        startDate: true,
        location: true,
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 25,
    });

    return { success: true, data: events };
  } catch (error: any) {
    console.error('[GuestAction] getTenantActiveEventsAction error:', error);
    return { success: false, error: error.message, data: [] };
  }
}
