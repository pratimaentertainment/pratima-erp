'use server';

import { LeadService } from '@/services/lead.service';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  confirmBookingSchema,
} from '@/schemas/lead.schema';
import { inquiryIdSchema } from '@/schemas/inquiry.schema';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

function sanitizeLead(lead: any) {
  if (!lead) return lead;
  return serializePrisma({
    ...lead,
    expectedRevenue:
      lead.expectedRevenue !== null && lead.expectedRevenue !== undefined
        ? typeof lead.expectedRevenue?.toNumber === 'function'
          ? lead.expectedRevenue.toNumber()
          : Number(lead.expectedRevenue) || 0
        : 0,
    package: lead.package
      ? {
          ...lead.package,
          basePrice:
            lead.package.basePrice !== null && lead.package.basePrice !== undefined
              ? typeof lead.package.basePrice?.toNumber === 'function'
                ? lead.package.basePrice.toNumber()
                : Number(lead.package.basePrice) || 0
              : 0,
        }
      : null,
  });
}

export async function createLeadFromInquiry(
  inquiryId: string,
  data: unknown
): Promise<
  | { success: true; lead: any; data: any; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    const validInquiryId = inquiryIdSchema.parse(inquiryId);
    const validated = createLeadSchema.parse(data);
    const lead = await LeadService.createFromInquiry(validInquiryId, validated);
    revalidatePath('/leads');
    revalidatePath('/inquiries');
    const sanitized = sanitizeLead(lead);
    return {
      success: true,
      lead: sanitized,
      data: sanitized,
      message: 'Lead created from inquiry successfully',
    };
  } catch (error: any) {
    console.error('createLeadFromInquiry error:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to create lead' };
  }
}

export async function updateLead(
  id: string,
  data: unknown
): Promise<
  | { success: true; lead: any; data: any; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    const validId = leadIdSchema.parse(id);
    const validated = updateLeadSchema.parse(data);
    const lead = await LeadService.update(validId, validated);
    revalidatePath('/leads');
    const sanitized = sanitizeLead(lead);
    return {
      success: true,
      lead: sanitized,
      data: sanitized,
      message: 'Lead updated successfully',
    };
  } catch (error: any) {
    console.error('updateLead error:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to update lead' };
  }
}

export async function deleteLead(
  id: string
): Promise<{ success: true; data?: void; message?: string } | { success: false; error: string }> {
  try {
    const validId = leadIdSchema.parse(id);
    await LeadService.softDelete(validId);
    revalidatePath('/leads');
    return { success: true, data: undefined, message: 'Lead deleted successfully' };
  } catch (error: any) {
    console.error('deleteLead error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation failed' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to delete lead' };
  }
}

export async function getLeadTimeline(id: string) {
  try {
    const validId = leadIdSchema.parse(id);
    const timeline = await LeadService.getTimeline(validId);
    const serialized = serializePrisma(timeline);
    return { success: true, timeline: serialized, data: serialized };
  } catch (error: any) {
    console.error('getLeadTimeline error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation failed' };
    }
    return { success: false, error: error.message || 'Failed to fetch timeline' };
  }
}

export async function confirmLeadBooking(
  leadId: string,
  notes?: string
): Promise<
  | { success: true; lead: any; customer: any; booking?: any; data?: any; message?: string }
  | { success: false; error: string }
> {
  try {
    const parsed = confirmBookingSchema.parse({ leadId, notes });
    const result = await LeadService.confirmBooking(parsed.leadId, parsed.notes || undefined);
    revalidatePath('/leads');
    revalidatePath(`/leads/${parsed.leadId}`);
    revalidatePath('/customers');
    revalidatePath('/operations');
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/calendar');
    revalidatePath('/operations/post-production');

    const sanitizedLead = sanitizeLead(result.lead);
    const serializedCustomer = serializePrisma(result.customer);
    const serializedBooking = serializePrisma(result.booking);

    return {
      success: true,
      lead: sanitizedLead,
      customer: serializedCustomer,
      booking: serializedBooking,
      data: {
        lead: sanitizedLead,
        customer: serializedCustomer,
        booking: serializedBooking,
      },
      message: 'Booking confirmed successfully',
    };
  } catch (error: any) {
    console.error('confirmLeadBooking error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation failed' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to confirm booking' };
  }
}
