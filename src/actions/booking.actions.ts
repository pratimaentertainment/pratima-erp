'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { 
  BookingService, 
  CreateOrConfirmBookingParams, 
  CreateManualBookingParams,
  UpdateBookingParams,
  ConcurrentWarningPayload 
} from '@/services/booking.service';
import { HandoffService } from '@/services/handoff.service';
import { QuotationHandoffService } from '@/services/booking/quotation-handoff.service';
import { FranchiseRoyaltyService } from '@/services/franchise-royalty.service';
import { getActiveContext } from '@/lib/context';
import type { ActionResponse } from '@/actions/action-response';

async function validateSession() {
  const context = await getActiveContext();
  if (!context || !context.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }

  // Branch resolution:
  // If in a specific branch, use context.branchId.
  // If in Owner "All Branches" mode (context.branchId is null), fallback safely to Head Office or first branch
  let fallbackBranchId: string | undefined = undefined;
  if (!context.branchId && context.branches.length > 0) {
    const headOffice = context.branches.find((b) => b.isHeadOffice) || context.branches[0];
    fallbackBranchId = headOffice ? headOffice.id : undefined;
  }

  return {
    tenantId: context.tenantId,
    userId: context.userId,
    branchId: context.branchId || fallbackBranchId,
    isAllBranches: context.isAllBranches,
    contextBranchId: context.branchId,
  };
}

function revalidateOperationsPaths(leadId?: string, customerId?: string, bookingId?: string) {
  revalidatePath('/operations');
  revalidatePath('/operations/bookings');
  if (bookingId) revalidatePath(`/operations/bookings/${bookingId}`);
  revalidatePath('/operations/calendar');
  revalidatePath('/operations/post-production');
  revalidatePath('/operations/dispatch');
  revalidatePath('/leads');
  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath('/customers');
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

/**
 * Server action to search customers by name, phone, email, or customer code.
 */
export async function searchCustomersAction(
  query?: string
): Promise<ActionResponse<Array<{
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  customerCode: string;
}>>> {
  try {
    const { tenantId } = await validateSession();
    const cleanQuery = query?.trim() || '';

    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(cleanQuery
          ? {
              OR: [
                { firstName: { contains: cleanQuery, mode: 'insensitive' } },
                { lastName: { contains: cleanQuery, mode: 'insensitive' } },
                { phone: { contains: cleanQuery, mode: 'insensitive' } },
                { email: { contains: cleanQuery, mode: 'insensitive' } },
                { customerCode: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        customerCode: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formatted = customers.map((c) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Client',
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      customerCode: c.customerCode,
    }));

    return {
      success: true,
      data: serializePrisma(formatted),
    };
  } catch (error: any) {
    console.error('[SEARCH_CUSTOMERS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to search customers',
    };
  }
}

/**
 * Server action to inspect concurrent events for a given date window.
 */
export async function checkConcurrentEventsAction(params: {
  startDate: string | Date;
  endDate?: string | Date;
  excludeBookingId?: string;
}): Promise<ActionResponse<ConcurrentWarningPayload>> {
  try {
    const { tenantId, branchId } = await validateSession();

    if (!params.startDate) {
      return { success: false, error: 'Start date is required to check event concurrency' };
    }

    const payload = await BookingService.checkConcurrentEvents({
      tenantId,
      branchId,
      startDate: params.startDate,
      endDate: params.endDate,
      excludeBookingId: params.excludeBookingId,
    });

    return { success: true, data: payload };
  } catch (error: any) {
    console.error('[CHECK_CONCURRENT_EVENTS_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to check concurrent events' };
  }
}

/**
 * Server action to convert a lead into a confirmed EventBooking, with crew allocation & soft-locking.
 */
export async function confirmBookingAction(
  params: Omit<CreateOrConfirmBookingParams, 'tenantId' | 'userId' | 'branchId'>
): Promise<ActionResponse<{ booking: any; concurrentWarning: ConcurrentWarningPayload }>> {
  try {
    const { tenantId, userId, branchId } = await validateSession();

    if (!params.leadId) {
      return { success: false, error: 'Lead ID is required' };
    }

    const result = await BookingService.createOrConfirmBooking({
      ...params,
      tenantId,
      userId,
      branchId,
    });

    // Revalidate affected operational dashboards
    revalidateOperationsPaths(params.leadId, result.booking?.customerId, result.booking?.id);

    // Auto-Royalty Hook: If booking is created in a franchisee studio, calculate & log franchisor royalty
    if (result.booking?.id) {
      try {
        await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(result.booking.id);
      } catch (royaltyErr) {
        console.error('[CONFIRM_BOOKING_ROYALTY_HOOK_ERROR]', royaltyErr);
      }
    }

    return {
      success: true,
      message: 'Booking successfully confirmed!',
      data: result,
    };
  } catch (error: any) {
    console.error('[CONFIRM_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to confirm booking',
    };
  }
}

/**
 * Server action to execute the automated Lead-to-Booking handoff bridge atomically.
 */
export async function convertLeadToBookingAction(
  params: {
    leadId: string;
    quotationId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    title?: string;
    location?: string;
    notes?: string;
    assignedStaff?: Array<{ userId: string; role: string; notes?: string }>;
  }
): Promise<ActionResponse<any>> {
  try {
    const { tenantId, userId, branchId } = await validateSession();

    if (!params.leadId) {
      return { success: false, error: 'Lead ID is required' };
    }

    const result = await HandoffService.convertLeadToBooking({
      ...params,
      tenantId,
      userId,
      branchId,
    });

    revalidateOperationsPaths(params.leadId, result.customer?.id, result.booking?.id);

    // Auto-Royalty Hook: If booking is created in a franchisee studio, calculate & log franchisor royalty
    if (result.booking?.id) {
      try {
        await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(result.booking.id);
      } catch (royaltyErr) {
        console.error('[CONVERT_LEAD_ROYALTY_HOOK_ERROR]', royaltyErr);
      }
    }

    return {
      success: true,
      message: 'Lead successfully converted to confirmed booking and initialized in post-production!',
      data: result,
    };
  } catch (error: any) {
    console.error('[CONVERT_LEAD_TO_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to convert lead to booking',
    };
  }
}

/**
 * Server action to execute the 1-Click Quotation-to-Booking atomic handoff.
 */
export async function convertQuotationToBookingAction(params: {
  quotationId: string;
  clientNotes?: string;
  acceptanceData?: {
    clientSignature?: string;
    acceptanceTerms?: string;
  };
}): Promise<ActionResponse<any>> {
  try {
    const { tenantId, userId, branchId } = await validateSession();

    if (!params.quotationId) {
      return { success: false, error: 'Quotation ID is required' };
    }

    const result = await QuotationHandoffService.processQuotationAcceptance({
      quotationId: params.quotationId,
      tenantId,
      userId,
      branchId,
      clientNotes: params.clientNotes,
      acceptanceData: params.acceptanceData,
    });

    revalidateOperationsPaths(result.lead?.id, result.customer?.id, result.booking?.id);
    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${params.quotationId}`);

    // Auto-Royalty Hook: If booking is created in a franchisee studio, calculate & log franchisor royalty
    if (result.booking?.id) {
      try {
        await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(result.booking.id);
      } catch (royaltyErr) {
        console.error('[CONVERT_QUOTATION_ROYALTY_HOOK_ERROR]', royaltyErr);
      }
    }

    return {
      success: true,
      message: result.isIdempotentReplay
        ? 'Quotation has already been accepted and booking is confirmed.'
        : 'Quotation accepted and booking successfully confirmed!',
      data: result,
    };
  } catch (error: any) {
    console.error('[CONVERT_QUOTATION_TO_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to convert quotation to booking',
    };
  }
}

/**
 * Server action to manually create a booking for walk-in clients (bypassing Lead pipeline).
 */
export async function createManualBookingAction(
  params: Omit<CreateManualBookingParams, 'tenantId' | 'userId'>
): Promise<ActionResponse<any>> {
  try {
    const { tenantId, userId, branchId } = await validateSession();

    const result = await BookingService.createBooking({
      ...params,
      branchId: params.branchId || branchId,
      tenantId,
      userId,
    });

    revalidateOperationsPaths(undefined, result.customer?.id, result.booking?.id);

    // Auto-Royalty Hook: If booking is created in a franchisee studio, calculate & log franchisor royalty
    if (result.booking?.id) {
      try {
        await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(result.booking.id);
      } catch (royaltyErr) {
        console.error('[CREATE_MANUAL_BOOKING_ROYALTY_HOOK_ERROR]', royaltyErr);
      }
    }

    return {
      success: true,
      message: 'Manual booking created successfully!',
      data: result,
    };
  } catch (error: any) {
    console.error('[CREATE_MANUAL_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to create manual booking',
    };
  }
}

/**
 * Server action to update existing booking details, dates, location, notes, and staff assignments.
 */
export async function updateBookingAction(
  params: Omit<UpdateBookingParams, 'tenantId' | 'userId'>
): Promise<ActionResponse<any>> {
  try {
    const { tenantId, userId } = await validateSession();

    if (!params.id) {
      return { success: false, error: 'Booking ID is required' };
    }

    const result = await BookingService.updateBooking({
      ...params,
      tenantId,
      userId,
    });

    revalidateOperationsPaths(undefined, undefined, params.id);

    // Auto-Royalty Hook: If booking total was updated, recalculate royalty if still PENDING
    if (params.id) {
      try {
        await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(params.id);
      } catch (royaltyErr) {
        console.error('[UPDATE_BOOKING_ROYALTY_HOOK_ERROR]', royaltyErr);
      }
    }

    return {
      success: true,
      message: 'Booking details updated successfully!',
      data: result,
    };
  } catch (error: any) {
    console.error('[UPDATE_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to update booking',
    };
  }
}

/**
 * Server action to fetch a booking by ID with full relations.
 */
export async function getBookingByIdAction(
  bookingId: string
): Promise<ActionResponse<any>> {
  try {
    if (!bookingId) {
      return { success: false, error: 'Booking ID is required' };
    }

    const { tenantId } = await validateSession();
    const booking = await BookingService.getBookingById(bookingId, tenantId);

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    return {
      success: true,
      data: booking,
    };
  } catch (error: any) {
    console.error('[GET_BOOKING_BY_ID_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to retrieve booking',
    };
  }
}

/**
 * Server action to cancel a booking.
 */
export async function cancelBookingAction(
  bookingId: string,
  reason?: string
): Promise<ActionResponse<any>> {
  try {
    if (!bookingId) {
      return { success: false, error: 'Booking ID is required' };
    }

    await validateSession();
    const result = await BookingService.cancelBooking(bookingId, reason);

    revalidateOperationsPaths(undefined, undefined, bookingId);
    revalidatePath('/operations');
    revalidatePath('/operations/gear');
    revalidatePath('/operations/post-production');
    revalidatePath('/operations/selections');
    revalidatePath('/operations/calendar');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Booking was successfully cancelled and all allocated gear & crew were released.',
      data: result,
    };
  } catch (error: any) {
    console.error('[CANCEL_BOOKING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to cancel booking',
    };
  }
}

/**
 * Server action to get available staff members for crew assignment.
 */
export async function getAvailableStaffAction(): Promise<
  ActionResponse<Array<{ id: string; name: string; email: string | null; designation: string | null; employmentType: string | null }>>
> {
  try {
    const { tenantId } = await validateSession();

    const staff = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        employmentType: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: serializePrisma(staff),
    };
  } catch (error: any) {
    console.error('[GET_AVAILABLE_STAFF_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to fetch team members' };
  }
}

/**
 * Server action to retrieve booking voucher data for viewing, printing, or sharing.
 */
export async function getBookingVoucherAction(
  bookingId: string
): Promise<ActionResponse<any>> {
  try {
    if (!bookingId) {
      return { success: false, error: 'Booking ID is required' };
    }

    const { tenantId } = await validateSession();
    const voucherData = await BookingService.getBookingVoucherData(bookingId, tenantId);
    if (!voucherData) {
      return { success: false, error: 'Booking voucher not found' };
    }

    return { success: true, data: voucherData };
  } catch (error: any) {
    console.error('[GET_BOOKING_VOUCHER_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to load booking voucher' };
  }
}
