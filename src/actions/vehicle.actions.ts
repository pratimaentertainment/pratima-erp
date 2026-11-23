'use server';

import { prisma } from '@/lib/prisma';
import { getActiveContext } from '@/lib/context';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { AssetStatus } from '@prisma/client';
import { z } from 'zod';
import { format } from 'date-fns';
import { VehicleService } from '@/services/vehicle.service';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Registration plate number is required').trim().toUpperCase(),
  makeModel: z.string().min(1, 'Vehicle make & model is required').trim(),
  type: z.enum(['VAN', 'SUV', 'SEDAN', 'TEMPO', 'TRUCK']).default('VAN'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(60).default(5),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG', 'HYBRID']).default('DIESEL'),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
  branchId: z.string().uuid('Invalid branch ID').optional().nullable(),
});

const updateVehicleSchema = z.object({
  id: z.string().uuid('Invalid vehicle ID'),
  plateNumber: z.string().min(1, 'Registration plate number is required').trim().toUpperCase(),
  makeModel: z.string().min(1, 'Vehicle make & model is required').trim(),
  type: z.enum(['VAN', 'SUV', 'SEDAN', 'TEMPO', 'TRUCK']).default('VAN'),
  capacity: z.coerce.number().int().min(1).max(60).default(5),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG', 'HYBRID']).default('DIESEL'),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
  branchId: z.string().uuid('Invalid branch ID').optional().nullable(),
});

const assignVehicleSchema = z.object({
  subEventId: z.string().uuid('Invalid SubEvent ID'),
  vehicleId: z.string().uuid('Invalid Vehicle ID'),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ==========================================
// 1. FLEET REGISTRY & CRUD ACTIONS
// ==========================================

/**
 * Retrieves all vehicles scoped to the active tenant and branch.
 * Supports Owner "All Branches" mode and branch filtering.
 */
export async function getVehiclesAction(branchFilterId?: string) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const whereClause: any = {
      tenantId: context.tenantId,
      deletedAt: null,
    };

    if (context.isAllBranches) {
      if (branchFilterId && branchFilterId !== 'ALL') {
        whereClause.branchId = branchFilterId;
      }
    } else if (context.branchId) {
      whereClause.branchId = context.branchId;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isHeadOffice: true,
          },
        },
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
          include: {
            subEvent: {
              select: {
                id: true,
                name: true,
                eventDate: true,
                startTime: true,
                endTime: true,
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
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ status: 'asc' }, { plateNumber: 'asc' }],
    });

    // Compute active bookings count & today's dispatch status
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const enrichedVehicles = vehicles.map((v) => {
      const activeBookingsCount = v.bookings.length;
      const isDispatchedToday = v.bookings.some((b) => {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        return start <= todayEnd && end >= todayStart;
      });

      return {
        ...v,
        activeBookingsCount,
        isDispatchedToday,
      };
    });

    return {
      success: true,
      data: serializePrisma(enrichedVehicles),
      isAllBranches: context.isAllBranches,
      activeBranchName: context.activeBranch?.name || 'Active Branch',
    };
  } catch (error: any) {
    console.error('[GET_VEHICLES_ACTION_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to retrieve vehicle fleet.' };
  }
}

/**
 * Computes high-level KPI fleet metrics for the dashboard banner.
 */
export async function getVehicleStatsAction() {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    const whereClause: any = {
      tenantId: context.tenantId,
      deletedAt: null,
    };

    if (!context.isAllBranches && context.branchId) {
      whereClause.branchId = context.branchId;
    }

    const [totalVehicles, availableCount, inUseCount, maintenanceCount] = await Promise.all([
      prisma.vehicle.count({ where: whereClause }),
      prisma.vehicle.count({ where: { ...whereClause, status: AssetStatus.AVAILABLE } }),
      prisma.vehicle.count({ where: { ...whereClause, status: AssetStatus.IN_USE } }),
      prisma.vehicle.count({ where: { ...whereClause, status: AssetStatus.MAINTENANCE } }),
    ]);

    return {
      success: true,
      data: {
        total: totalVehicles,
        available: availableCount,
        inUse: inUseCount,
        maintenance: maintenanceCount,
      },
    };
  } catch (error: any) {
    console.error('[GET_VEHICLE_STATS_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to retrieve fleet metrics.' };
  }
}

/**
 * Creates a new vehicle in the studio fleet.
 */
export async function createVehicleAction(input: z.infer<typeof createVehicleSchema>) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const payload = createVehicleSchema.parse(input);

    // Resolve branch
    let targetBranchId = payload.branchId || context.branchId;
    if (!targetBranchId) {
      const primaryBranch = context.branches.find((b) => b.isHeadOffice) || context.branches[0];
      targetBranchId = primaryBranch ? primaryBranch.id : null;
    }

    if (!targetBranchId) {
      return { success: false, error: 'A branch must be selected for this vehicle.' };
    }

    // Verify duplicate plate number
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        plateNumber: payload.plateNumber,
        deletedAt: null,
      },
    });

    if (existingVehicle) {
      return {
        success: false,
        error: `A vehicle with plate number "${payload.plateNumber}" already exists in the system.`,
      };
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: context.tenantId,
        branchId: targetBranchId,
        plateNumber: payload.plateNumber,
        makeModel: payload.makeModel,
        type: payload.type,
        capacity: payload.capacity,
        fuelType: payload.fuelType,
        driverName: payload.driverName || null,
        driverPhone: payload.driverPhone || null,
        notes: payload.notes || null,
        status: payload.status as AssetStatus,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    revalidatePath('/operations/vehicles');
    return {
      success: true,
      data: serializePrisma(vehicle),
      message: `Vehicle "${vehicle.plateNumber}" added to fleet successfully.`,
    };
  } catch (error: any) {
    console.error('[CREATE_VEHICLE_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to add vehicle to fleet.' };
  }
}

/**
 * Updates an existing vehicle's configuration.
 */
export async function updateVehicleAction(input: z.infer<typeof updateVehicleSchema>) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const payload = updateVehicleSchema.parse(input);

    // Verify vehicle belongs to tenant
    const existing = await prisma.vehicle.findFirst({
      where: { id: payload.id, tenantId: context.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Vehicle not found or access denied.' };
    }

    // If plate number changed, ensure no duplicate
    if (payload.plateNumber !== existing.plateNumber) {
      const duplicate = await prisma.vehicle.findFirst({
        where: {
          plateNumber: payload.plateNumber,
          id: { not: payload.id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return {
          success: false,
          error: `Another vehicle with plate number "${payload.plateNumber}" already exists.`,
        };
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id: payload.id },
      data: {
        plateNumber: payload.plateNumber,
        makeModel: payload.makeModel,
        type: payload.type,
        capacity: payload.capacity,
        fuelType: payload.fuelType,
        driverName: payload.driverName || null,
        driverPhone: payload.driverPhone || null,
        notes: payload.notes || null,
        status: payload.status as AssetStatus,
        ...(payload.branchId ? { branchId: payload.branchId } : {}),
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    revalidatePath('/operations/vehicles');
    return {
      success: true,
      data: serializePrisma(updated),
      message: `Vehicle "${updated.plateNumber}" updated successfully.`,
    };
  } catch (error: any) {
    console.error('[UPDATE_VEHICLE_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to update vehicle.' };
  }
}

/**
 * Soft deletes a vehicle from the active fleet.
 * Blocks deletion if confirmed future shoot bookings exist.
 */
export async function deleteVehicleAction(vehicleId: string) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: context.tenantId, deletedAt: null },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
            endTime: { gte: new Date() },
          },
        },
      },
    });

    if (!vehicle) {
      return { success: false, error: 'Vehicle not found or access denied.' };
    }

    if (vehicle.bookings.length > 0) {
      return {
        success: false,
        error: `Cannot delete vehicle "${vehicle.plateNumber}". It has ${vehicle.bookings.length} upcoming shoot reservation(s). Cancel the dispatches first.`,
      };
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        deletedAt: new Date(),
        status: AssetStatus.RETIRED,
      },
    });

    revalidatePath('/operations/vehicles');
    return {
      success: true,
      message: `Vehicle "${vehicle.plateNumber}" removed from active fleet.`,
    };
  } catch (error: any) {
    console.error('[DELETE_VEHICLE_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to remove vehicle.' };
  }
}

/**
 * Quick toggle for vehicle operational status (e.g. mark in maintenance).
 */
export async function toggleVehicleStatusAction(vehicleId: string, status: AssetStatus) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: context.tenantId, deletedAt: null },
    });

    if (!vehicle) {
      return { success: false, error: 'Vehicle not found' };
    }

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status },
    });

    revalidatePath('/operations/vehicles');
    return {
      success: true,
      data: serializePrisma(updated),
      message: `Status updated to ${status}.`,
    };
  } catch (error: any) {
    console.error('[TOGGLE_VEHICLE_STATUS_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to update vehicle status.' };
  }
}

// ==========================================
// 2. SHOOT VEHICLE DISPATCH & COLLISION ENGINE
// ==========================================

/**
 * Assigns a fleet vehicle to a shoot SubEvent.
 * Includes Operational Readiness checks and Double-Booking Collision Detection.
 */
export async function assignVehicleToSubEventAction(input: z.infer<typeof assignVehicleSchema>) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const payload = assignVehicleSchema.parse(input);

    const booking = await VehicleService.assignVehicleToSubEvent({
      tenantId: context.tenantId,
      vehicleId: payload.vehicleId,
      subEventId: payload.subEventId,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      notes: payload.notes,
    });

    // Revalidate affected operational routes
    revalidatePath('/operations/vehicles');
    revalidatePath('/operations/bookings');
    if (booking.eventBookingId) {
      revalidatePath(`/operations/bookings/${booking.eventBookingId}`);
    }

    return {
      success: true,
      data: serializePrisma(booking),
      message: `Vehicle "${booking.vehicle.plateNumber}" successfully assigned.`,
    };
  } catch (error: any) {
    console.error('[ASSIGN_VEHICLE_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to dispatch vehicle.' };
  }
}

/**
 * Removes/cancels a vehicle assignment from a SubEvent.
 */
export async function removeVehicleFromSubEventAction(vehicleBookingId: string) {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized: No active studio session' };
    }

    const booking = await prisma.vehicleBooking.findFirst({
      where: { id: vehicleBookingId, tenantId: context.tenantId },
      include: {
        vehicle: true,
        subEvent: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Vehicle booking not found or access denied.' };
    }

    await prisma.vehicleBooking.delete({
      where: { id: vehicleBookingId },
    });

    revalidatePath('/operations/vehicles');
    revalidatePath('/operations/bookings');
    if (booking.eventBookingId) {
      revalidatePath(`/operations/bookings/${booking.eventBookingId}`);
    }

    return {
      success: true,
      message: `Vehicle "${booking.vehicle.plateNumber}" deallocated from shoot successfully.`,
    };
  } catch (error: any) {
    console.error('[REMOVE_VEHICLE_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to remove vehicle reservation.' };
  }
}

/**
 * Retrieves upcoming vehicle dispatches for the Schedule view.
 */
export async function getUpcomingVehicleDispatchesAction() {
  try {
    const context = await getActiveContext();
    if (!context || !context.tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    const whereClause: any = {
      tenantId: context.tenantId,
      status: 'CONFIRMED',
      endTime: { gte: new Date() },
    };

    if (!context.isAllBranches && context.branchId) {
      whereClause.vehicle = { branchId: context.branchId };
    }

    const dispatches = await prisma.vehicleBooking.findMany({
      where: whereClause,
      include: {
        vehicle: {
          include: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
        subEvent: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            startTime: true,
            endTime: true,
            locationVenue: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    return {
      success: true,
      data: serializePrisma(dispatches),
    };
  } catch (error: any) {
    console.error('[GET_UPCOMING_DISPATCHES_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to fetch upcoming dispatches.' };
  }
}
