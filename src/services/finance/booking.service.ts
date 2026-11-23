import { prisma } from '@/lib/prisma';
import { EventBookingStatus } from '@prisma/client';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { serializePrisma } from '@/lib/serialize';

export class BookingService {
  private static async validateSession() {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) throw new Error('Unauthorized');

    const context = await getActiveContext();
    return {
      tenantId: user.tenantId as string,
      userId: user.id as string,
      branchId: (context?.activeBranch?.id as string) || user.branchId,
    };
  }

  /**
   * Explicitly locks event dates for a lead/customer, with conflict checking.
   */
  static async lockDates(params: {
    leadId?: string;
    customerId: string;
    quotationId?: string;
    invoiceId?: string;
    startDate: Date;
    endDate: Date;
    title: string;
    location?: string;
    notes?: string;
    status?: EventBookingStatus;
  }) {
    const { tenantId, userId, branchId } = await this.validateSession();

    return await prisma.$transaction(async (tx) => {
      // Check date availability / overlaps in this branch
      const overlaps = await tx.eventBooking.findMany({
        where: {
          tenantId,
          branchId,
          status: { in: [EventBookingStatus.BLOCKED, EventBookingStatus.CONFIRMED] },
          deletedAt: null,
          OR: [
            {
              startDate: { lte: params.endDate },
              endDate: { gte: params.startDate },
            },
          ],
        },
      });

      const bookingNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'BOOKING');

      const booking = await tx.eventBooking.create({
        data: {
          tenantId,
          branchId,
          bookingNumber,
          title: params.title,
          leadId: params.leadId || null,
          customerId: params.customerId,
          quotationId: params.quotationId || null,
          invoiceId: params.invoiceId || null,
          startDate: params.startDate,
          endDate: params.endDate,
          status: params.status || EventBookingStatus.CONFIRMED,
          location: params.location || null,
          notes: params.notes || null,
          createdById: userId,
        },
      });

      return serializePrisma({ booking, conflictCount: overlaps.length });
    });
  }

  static async getBookings(filters?: any) {
    const { tenantId, branchId } = await this.validateSession();
    const bookings = await prisma.eventBooking.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
        ...filters,
      },
      include: {
        customer: true,
        lead: true,
        invoice: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return serializePrisma(bookings);
  }
}
