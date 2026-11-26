'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Returns AI Face Recognition unlock status for an event booking, along with the tenant's current AI event credit balance.
 */
export async function getEventAiStatusAction(eventId: string) {
  try {
    const session = await auth();
    const tenantId = (session?.user as any)?.tenantId;

    if (!session?.user || !tenantId) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const [booking, tenant] = await Promise.all([
      prisma.eventBooking.findFirst({
        where: { id: eventId, tenantId, deletedAt: null },
        select: {
          id: true,
          title: true,
          bookingNumber: true,
          aiFaceRecognitionUnlocked: true,
          aiUnlockedAt: true,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          aiEventCredits: true,
        },
      }),
    ]);

    if (!booking) {
      return { success: false, error: 'Event booking not found.' };
    }

    return {
      success: true,
      data: {
        booking: {
          id: booking.id,
          title: booking.title,
          bookingNumber: booking.bookingNumber,
          aiFaceRecognitionUnlocked: booking.aiFaceRecognitionUnlocked,
          aiUnlockedAt: booking.aiUnlockedAt ? booking.aiUnlockedAt.toISOString() : null,
        },
        aiEventCredits: tenant?.aiEventCredits ?? 0,
      },
    };
  } catch (error: any) {
    console.error('[getEventAiStatusAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch AI face recognition status.',
    };
  }
}

/**
 * Redeems 1 prepaid AI event credit to unlock AI Face Recognition for the specified event booking.
 */
export async function redeemAiEventCreditAction(eventId: string) {
  try {
    const session = await auth();
    const tenantId = (session?.user as any)?.tenantId;

    if (!session?.user || !tenantId) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, aiEventCredits: true },
    });

    if (!tenant || tenant.aiEventCredits < 1) {
      return {
        success: false,
        error: 'Insufficient AI event credits. Please purchase a credit pack or pay ₹149 to unlock this event.',
      };
    }

    const booking = await prisma.eventBooking.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        aiFaceRecognitionUnlocked: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Event booking not found.' };
    }

    if (booking.aiFaceRecognitionUnlocked) {
      return {
        success: true,
        message: 'AI Face Recognition is already unlocked for this event.',
      };
    }

    // Atomically decrement credit and unlock event
    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { aiEventCredits: { decrement: 1 } },
      }),
      prisma.eventBooking.update({
        where: { id: eventId },
        data: {
          aiFaceRecognitionUnlocked: true,
          aiUnlockedAt: new Date(),
        },
      }),
      prisma.billingTransaction.create({
        data: {
          tenantId,
          amount: 0,
          currency: 'INR',
          status: 'SUCCESS',
          paymentMode: 'CREDIT_WALLET',
          purchaseType: 'PER_EVENT_AI',
          eventBookingId: eventId,
          notes: `Redeemed 1 prepaid AI credit for event "${booking.title}"`,
        },
      }),
    ]);

    revalidatePath(`/operations/bookings/${eventId}`);
    revalidatePath('/operations/bookings');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: 'AI Face Recognition unlocked successfully for this event!',
    };
  } catch (error: any) {
    console.error('[redeemAiEventCreditAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to redeem AI event credit.',
    };
  }
}
