'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateQuotationSchema, GetQuotationSchema, CreateRevisionSchema, UpdateRevisionDraftSchema, ChangeQuotationStatusSchema } from './quotation.schemas';
import { QuotationService } from '@/services/quotation/quotation.service';
import { ActionResponse } from './action-response';
import { BusinessRuleError, QuotationNotFoundError, InvalidStateTransitionError } from '@/services/quotation/quotation.errors';
import { ServiceContext, QuotationDetailDto } from '@/services/quotation/quotation.types';
import { PERMISSIONS } from '@/constants/permissions.constants';
import { buildContextAndAuthorize as getCanonicalContext } from '@/lib/application/utils/context';
import { prisma } from '@/lib/prisma';
import { QuotationHandoffService } from '@/services/booking/quotation-handoff.service';

// --- Shared Utilities ---

function mapDomainError(error: any): string {
  console.error('[QUOTATION_ERROR]', error);
  if (error instanceof BusinessRuleError || error instanceof InvalidStateTransitionError || error instanceof QuotationNotFoundError) {
    return error.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

async function buildContextAndAuthorize(requiredPermission: string): Promise<ServiceContext> {
  const ctx = await getCanonicalContext(requiredPermission);

  let branchId = ctx.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({
      where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
      orderBy: { isHeadOffice: 'desc' },
    });
    if (!branch) {
      throw new Error('No active branch found for the current tenant');
    }
    branchId = branch.id;
  }

  return {
    tenantId: ctx.tenantId,
    branchId,
    userId: ctx.userId,
    roleIds: ctx.roleIds,
    permissions: ctx.permissions,
    requestId: ctx.requestId,
  };
}

// --- Shared Utilities ---

async function ensureItemsAndPackages(items: any[] | undefined, ctx: ServiceContext) {
  if (!items || !Array.isArray(items)) return;

  for (const item of items) {
    if (!item.packageId) {
      let pkg = await prisma.package.findFirst({
        where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
      });
      if (!pkg) {
        let category = await prisma.packageCategory.findFirst({
          where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
        });
        if (!category) {
          category = await prisma.packageCategory.create({
            data: {
              tenantId: ctx.tenantId,
              name: 'Photography Services',
              code: 'PHOTO_SERVICES',
              isActive: true,
            },
          });
        }
        pkg = await prisma.package.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: ctx.branchId,
            packageCode: 'CUSTOM_SERVICE',
            name: item.itemName || 'Custom Service',
            categoryId: category.id,
            basePrice: item.unitPrice || 0,
            isActive: true,
            version: 1,
            isCurrentVersion: true,
          },
        });
      }
      item.packageId = pkg.id;
    }

    // Normalize item discount types to Prisma DiscountType (PERCENTAGE | FIXED | NONE)
    if ((item.itemDiscountType as any) === 'FIXED_AMOUNT') {
      item.itemDiscountType = 'FIXED';
    }
    if ((item.discountType as any) === 'FIXED_AMOUNT') {
      item.discountType = 'FIXED';
    }
  }
}

// --- Actions ---

export async function createQuotationAction(payload: z.infer<typeof CreateQuotationSchema>): Promise<ActionResponse<any>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.CREATE);

    const validationResult = CreateQuotationSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const data = validationResult.data as any;

    await ensureItemsAndPackages(data.items, ctx);

    // Map top-level discount fields if discount object not populated
    if (!data.discount && data.discountType && data.discountType !== 'NONE') {
      data.discount = {
        discountType: (data.discountType === 'FIXED_AMOUNT' || data.discountType === 'FIXED') ? 'FIXED' : data.discountType,
        discountValue: data.discountValue || 0,
      };
    } else if (data.discount) {
      if ((data.discount.discountType as any) === 'FIXED_AMOUNT') {
        data.discount.discountType = 'FIXED';
      }
    }

    const quotation = await QuotationService.createQuotation(ctx, data);

    // Revalidate affected routes so Kanban board and quotation lists reflect changes immediately
    revalidatePath('/sales/quotations');
    revalidatePath('/leads');
    if (data.leadId) {
      revalidatePath(`/leads/${data.leadId}`);
    }
    
    return { success: true, data: quotation, message: 'Quotation created successfully' };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}

export async function getQuotationByIdAction(payload: z.infer<typeof GetQuotationSchema>): Promise<ActionResponse<QuotationDetailDto>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.VIEW);

    const validationResult = GetQuotationSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const { id } = validationResult.data;

    const quotation = await QuotationService.getQuotationById(ctx, id);
    
    return { success: true, data: quotation };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}

export async function createRevisionAction(payload: z.infer<typeof CreateRevisionSchema>): Promise<ActionResponse<QuotationDetailDto>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.CREATE_REVISION);

    const validationResult = CreateRevisionSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const { quotationId, ...data } = validationResult.data as any;

    if (data.items) {
      await ensureItemsAndPackages(data.items, ctx);
    }

    if (data.discount?.discountType === 'FIXED_AMOUNT') {
      data.discount.discountType = 'FIXED';
    }

    const revision = await QuotationService.createRevision(ctx, quotationId, data);

    // Revalidate affected routes so Kanban board and quotation views update immediately
    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath(`/sales/quotations/${quotationId}/edit`);
    revalidatePath('/leads');
    if (revision.leadId) {
      revalidatePath(`/leads/${revision.leadId}`);
    }
    
    return { success: true, data: revision, message: 'Revision created successfully' };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}

export async function updateRevisionDraftAction(payload: z.infer<typeof UpdateRevisionDraftSchema>): Promise<ActionResponse<QuotationDetailDto>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.UPDATE_DRAFT);

    const validationResult = UpdateRevisionDraftSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const { revisionId, ...data } = validationResult.data as any;

    if (data.items) {
      await ensureItemsAndPackages(data.items, ctx);
    }

    if (data.discount?.discountType === 'FIXED_AMOUNT') {
      data.discount.discountType = 'FIXED';
    }

    const quotation = await QuotationService.updateRevisionDraft(ctx, revisionId, data);

    // Revalidate affected routes so Kanban board and quotation views update immediately
    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${quotation.id}`);
    revalidatePath(`/sales/quotations/${quotation.id}/edit`);
    revalidatePath('/leads');
    if (quotation.leadId) {
      revalidatePath(`/leads/${quotation.leadId}`);
    }
    
    return { success: true, data: quotation, message: 'Draft updated successfully' };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}

export async function changeQuotationStatusAction(payload: z.infer<typeof ChangeQuotationStatusSchema>): Promise<ActionResponse<QuotationDetailDto>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.CHANGE_STATUS);

    const validationResult = ChangeQuotationStatusSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const { quotationId, status, reason } = validationResult.data;

    // Use ServiceQuotationStatus enum equivalent typing since Zod string enum matches Prisma enum structurally
    const quotation = await QuotationService.changeStatus(ctx, quotationId, status as any, reason);

    // If status transitioned to APPROVED or CONVERTED, trigger atomic handoff to booking
    if (status === 'APPROVED' || status === 'CONVERTED') {
      try {
        await QuotationHandoffService.processQuotationAcceptance({
          quotationId,
          tenantId: ctx.tenantId,
          branchId: ctx.branchId,
          userId: ctx.userId,
          clientNotes: reason,
        });
      } catch (handoffErr) {
        console.warn('[QUOTATION_STATUS_HANDOFF_WARNING]', handoffErr);
      }
    }

    // Revalidate affected routes so Kanban board and quotation views update immediately
    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath('/leads');
    if (quotation.leadId) {
      revalidatePath(`/leads/${quotation.leadId}`);
    }
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/calendar');
    
    return { success: true, data: quotation, message: 'Status updated successfully' };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}

/**
 * Explicit operator action to accept a quotation and execute atomic 1-Click Quotation-to-Booking handoff.
 */
export async function acceptQuotationByOperatorAction(
  quotationId: string,
  notes?: string
): Promise<ActionResponse<any>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.QUOTATION.CHANGE_STATUS);

    const result = await QuotationHandoffService.processQuotationAcceptance({
      quotationId,
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      userId: ctx.userId,
      clientNotes: notes,
    });

    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath('/leads');
    if (result.lead?.id) {
      revalidatePath(`/leads/${result.lead.id}`);
    }
    revalidatePath('/customers');
    revalidatePath('/operations/bookings');
    revalidatePath('/operations/calendar');

    return {
      success: true,
      data: result,
      message: result.isIdempotentReplay
        ? 'Quotation has already been accepted and booking is confirmed.'
        : 'Quotation accepted and booking successfully confirmed!',
    };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.startsWith('Forbidden')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: mapDomainError(error) };
  }
}
