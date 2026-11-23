'use server';

import { revalidatePath } from 'next/cache';
import { InquiryService } from '@/services/inquiry.service';
import {
  createInquirySchema,
  updateInquirySchema,
  inquiryIdSchema,
} from '@/schemas/inquiry.schema';
import { serializePrisma } from '@/lib/serialize';
import { ActionResponse } from './action-response';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

function sanitizeInquiry(inquiry: any) {
  if (!inquiry) return inquiry;
  return serializePrisma({
    ...inquiry,
    budget:
      inquiry.budget !== null && inquiry.budget !== undefined
        ? typeof inquiry.budget?.toNumber === 'function'
          ? inquiry.budget.toNumber()
          : Number(inquiry.budget) || null
        : null,
    lead: inquiry.lead
      ? {
          ...inquiry.lead,
          expectedRevenue:
            inquiry.lead.expectedRevenue !== null && inquiry.lead.expectedRevenue !== undefined
              ? typeof inquiry.lead.expectedRevenue?.toNumber === 'function'
                ? inquiry.lead.expectedRevenue.toNumber()
                : Number(inquiry.lead.expectedRevenue) || null
              : null,
        }
      : null,
  });
}

export async function createInquiry(data: unknown): Promise<ActionResponse<any>> {
  try {
    const validated = createInquirySchema.parse(data);
    const record = await InquiryService.create(validated);
    revalidatePath('/inquiries');
    revalidatePath('/dashboard/inquiries');
    return {
      success: true,
      data: sanitizeInquiry(record),
      message: 'Inquiry created successfully',
    };
  } catch (error: any) {
    console.error('createInquiry error:', error);
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
    return { success: false, error: error.message || 'Failed to create inquiry' };
  }
}

export async function updateInquiry(id: string, data: unknown): Promise<ActionResponse<any>> {
  try {
    const validId = inquiryIdSchema.parse(id);
    const validated = updateInquirySchema.parse(data);
    const record = await InquiryService.update(validId, validated);
    revalidatePath('/inquiries');
    revalidatePath('/dashboard/inquiries');
    return {
      success: true,
      data: sanitizeInquiry(record),
      message: 'Inquiry updated successfully',
    };
  } catch (error: any) {
    console.error('updateInquiry error:', error);
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
    return { success: false, error: error.message || 'Failed to update inquiry' };
  }
}

export async function deleteInquiry(id: string): Promise<ActionResponse<void>> {
  try {
    const validId = inquiryIdSchema.parse(id);
    await InquiryService.softDelete(validId);
    revalidatePath('/inquiries');
    revalidatePath('/dashboard/inquiries');
    return { success: true, data: undefined, message: 'Inquiry deleted successfully' };
  } catch (error: any) {
    console.error('deleteInquiry error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation failed' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to delete inquiry' };
  }
}
