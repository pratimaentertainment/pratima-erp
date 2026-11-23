import { prisma } from '@/lib/prisma';
import { AssetStatus } from '@prisma/client';
import { format } from 'date-fns';

export interface VehicleCollisionResult {
  hasCollision: boolean;
  conflictingBooking?: {
    id: string;
    subEventName?: string;
    bookingTitle?: string;
    bookingNumber?: string;
    date: Date;
  } | null;
  message?: string;
}

export class VehicleService {
  /**
   * Evaluates if a vehicle is already booked for another shoot on the given calendar date.
   */
  static async checkCollision(
    vehicleId: string,
    eventDate: Date,
    excludeSubEventId?: string
  ): Promise<VehicleCollisionResult> {
    const shootDate = new Date(eventDate);
    const dayStart = new Date(shootDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(shootDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const conflictingBooking = await prisma.vehicleBooking.findFirst({
      where: {
        vehicleId,
        status: 'CONFIRMED',
        ...(excludeSubEventId ? { subEventId: { not: excludeSubEventId } } : {}),
        OR: [
          {
            startTime: { lte: dayEnd },
            endTime: { gte: dayStart },
          },
          {
            subEvent: {
              eventDate: {
                gte: dayStart,
                lte: dayEnd,
              },
            },
          },
        ],
      },
      include: {
        subEvent: {
          select: { name: true, eventDate: true },
        },
        eventBooking: {
          select: { title: true, bookingNumber: true },
        },
        vehicle: {
          select: { plateNumber: true },
        },
      },
    });

    if (!conflictingBooking) {
      return { hasCollision: false };
    }

    const conflictName =
      conflictingBooking.subEvent?.name ||
      conflictingBooking.eventBooking?.title ||
      'Another Function';
    const conflictBookingNo = conflictingBooking.eventBooking?.bookingNumber
      ? ` (${conflictingBooking.eventBooking.bookingNumber})`
      : '';
    const formattedDate = format(shootDate, 'dd MMM yyyy');

    return {
      hasCollision: true,
      conflictingBooking: {
        id: conflictingBooking.id,
        subEventName: conflictingBooking.subEvent?.name,
        bookingTitle: conflictingBooking.eventBooking?.title,
        bookingNumber: conflictingBooking.eventBooking?.bookingNumber,
        date: conflictingBooking.subEvent?.eventDate || conflictingBooking.startTime,
      },
      message: `Double-Booking Collision Alert: Vehicle "${conflictingBooking.vehicle.plateNumber}" is already booked for "${conflictName}"${conflictBookingNo} on ${formattedDate}. Please allocate a different vehicle.`,
    };
  }

  /**
   * Assigns a vehicle to a SubEvent after verifying availability, readiness, and collision status.
   */
  static async assignVehicleToSubEvent(params: {
    tenantId: string;
    vehicleId: string;
    subEventId: string;
    driverName?: string | null;
    driverPhone?: string | null;
    notes?: string | null;
  }) {
    // 1. Verify Vehicle & Operational Readiness
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: params.vehicleId, tenantId: params.tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new Error('Selected vehicle was not found in studio fleet.');
    }

    if (vehicle.status === AssetStatus.MAINTENANCE) {
      throw new Error(
        `Operational Block: Vehicle "${vehicle.plateNumber}" is currently in MAINTENANCE and cannot be dispatched.`
      );
    }

    if (vehicle.status === AssetStatus.RETIRED) {
      throw new Error(
        `Operational Block: Vehicle "${vehicle.plateNumber}" is RETIRED and not available for shoot dispatch.`
      );
    }

    // 2. Fetch SubEvent & Parent EventBooking
    const subEvent = await prisma.subEvent.findFirst({
      where: { id: params.subEventId, tenantId: params.tenantId },
      include: {
        eventBooking: {
          select: { id: true, title: true, bookingNumber: true },
        },
      },
    });

    if (!subEvent) {
      throw new Error('Shoot SubEvent not found.');
    }

    // Check if vehicle is already assigned to this exact SubEvent
    const alreadyAssigned = await prisma.vehicleBooking.findFirst({
      where: {
        subEventId: subEvent.id,
        vehicleId: vehicle.id,
        status: 'CONFIRMED',
      },
    });

    if (alreadyAssigned) {
      throw new Error(`Vehicle "${vehicle.plateNumber}" is already allocated to this SubEvent.`);
    }

    // 3. Double-Booking Collision Engine
    const collision = await this.checkCollision(vehicle.id, subEvent.eventDate, subEvent.id);
    if (collision.hasCollision) {
      throw new Error(collision.message);
    }

    // 4. Create the VehicleBooking reservation
    const shootDate = new Date(subEvent.eventDate);
    const dayStart = new Date(shootDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(shootDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const driverName = params.driverName || vehicle.driverName || null;
    const driverPhone = params.driverPhone || vehicle.driverPhone || null;

    return prisma.vehicleBooking.create({
      data: {
        tenantId: params.tenantId,
        vehicleId: vehicle.id,
        subEventId: subEvent.id,
        eventBookingId: subEvent.eventBookingId,
        driverName,
        driverPhone,
        notes: params.notes || null,
        purpose: `Shoot transport for ${subEvent.name}`,
        startTime: dayStart,
        endTime: dayEnd,
        status: 'CONFIRMED',
      },
      include: {
        vehicle: true,
      },
    });
  }
}
