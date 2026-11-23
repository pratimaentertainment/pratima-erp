'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { QuotationRepository } from '@/repositories/quotation.repository';
import { QuotationMapper } from '@/services/quotation/quotation.mapper';
import { serializePrisma } from '@/lib/serialize';
import type { ActionResponse } from '@/actions/action-response';
import type { QuotationDetailDto } from '@/services/quotation/quotation.types';
import { InvoiceService } from '@/services/finance/invoice.service';
import { QuotationHandoffService } from '@/services/booking/quotation-handoff.service';

export interface QuotationAcceptanceInput {
  clientSignature?: string;
  acceptanceTerms?: string;
}

/**
 * Public action to retrieve a quotation for client view without authentication guard.
 */
export async function getPublicQuotation(id: string): Promise<ActionResponse<QuotationDetailDto>> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid quotation ID' };
    }

    const quotation = await QuotationRepository.findById(id);
    if (!quotation) {
      return { success: false, error: 'Quotation not found' };
    }

    const dto = QuotationMapper.toQuotationDetailDto(quotation as any);
    
    const quotationRaw = quotation as any;
    const tenantRaw = (quotationRaw.lead?.tenant || quotationRaw.quotationRevisions?.[0]?.tenant || dto.tenant) as any;
    const branchRaw = (quotationRaw.lead?.branch || quotationRaw.quotationRevisions?.[0]?.branch || (dto as any).branch) as any;

    const customPortfolioUrls = Array.isArray(quotationRaw.customPortfolioUrls) ? quotationRaw.customPortfolioUrls : [];
    const defaultPortfolioUrls = Array.isArray(tenantRaw?.defaultPortfolioUrls) ? tenantRaw.defaultPortfolioUrls : [];
    const portfolioUrls = (customPortfolioUrls.length > 0) ? customPortfolioUrls : defaultPortfolioUrls;

    const customPromo = quotationRaw.customPromoVideoUrl?.trim();
    const defaultPromo = tenantRaw?.defaultPromoVideoUrl?.trim();
    const promoVideoUrl = customPromo || defaultPromo || null;

    const whyChooseUs = Array.isArray(tenantRaw?.whyChooseUs) ? tenantRaw.whyChooseUs : [];

    const studioPhone = branchRaw?.phone || tenantRaw?.phone || tenantRaw?.contactPhone || null;
    const studioEmail = branchRaw?.email || tenantRaw?.email || null;

    // Strictly sanitize payload to prevent leaking internal notes, cost structures, or staff data
    const sanitizedDto: any = {
      id: dto.id,
      quoteNumber: dto.quoteNumber || dto.quotationNumber,
      quotationNumber: dto.quotationNumber || dto.quoteNumber,
      title: dto.title,
      eventType: dto.eventType,
      status: dto.status,
      pricingMode: dto.pricingMode || (quotationRaw.pricingMode ?? 'ITEMIZED'),
      lumpSumAmount: dto.lumpSumAmount ?? (quotationRaw.lumpSumAmount ? Number(quotationRaw.lumpSumAmount) : null),
      validUntil: dto.validUntil,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      subtotal: dto.subtotal,
      totalDiscount: dto.totalDiscount,
      totalTax: dto.totalTax,
      grandTotal: dto.grandTotal,
      currency: dto.currency,
      currencyCode: dto.currencyCode,
      version: dto.version,
      items: (dto.items && dto.items.length > 0 ? dto.items : (quotationRaw.quotationRevisions?.[0]?.items || [])).map((item: any) => {
        const extra = item.snapshotExtra && typeof item.snapshotExtra === 'object' ? item.snapshotExtra : null;
        const pkg = item.package;
        const packageDesc = pkg?.description || pkg?.notes || null;
        const packageItemsDesc = Array.isArray(pkg?.items) && pkg.items.length > 0
          ? pkg.items.map((pi: any) => pi.description || pi.serviceComponent?.name).filter(Boolean).join('\n')
          : null;
        const desc = 
          item.description || 
          extra?.customDescription || 
          extra?.description || 
          packageDesc || 
          packageItemsDesc || 
          extra?.packageDetails || 
          null;

        return {
          ...item,
          itemName: item.itemName || pkg?.name || 'Photography Service',
          description: desc,
          package: pkg ? {
            id: pkg.id,
            name: pkg.name,
            description: packageDesc,
          } : item.package || null,
          quotationFunctionId: item.quotationFunctionId || item.quotationFunction?.id || extra?.functionReference || null,
          functionName: item.functionName || item.quotationFunction?.name || null,
          snapshotExtra: extra,
        };
      }),
      subjects: dto.subjects || quotationRaw.subjects || [],
      functions: dto.functions || quotationRaw.functions || [],
      deliverables: dto.deliverables || quotationRaw.deliverables || [],
      portfolioUrls,
      promoVideoUrl,
      whyChooseUs,
      clientName: dto.customerName,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      clientSignature: dto.clientSignature,
      acceptedAt: dto.acceptedAt,
      clientIpAddress: dto.clientIpAddress,
      acceptanceTerms: dto.acceptanceTerms,
      advanceRequired: dto.advanceRequired,
      tenant: tenantRaw ? {
        id: tenantRaw.id,
        name: tenantRaw.name,
        tradeName: tenantRaw.tradeName || tenantRaw.name,
        logoUrl: tenantRaw.logoUrl || null,
        settings: {
          ...(tenantRaw.settings || {}),
          studioName: tenantRaw.tradeName || tenantRaw.name,
          bankDetails: tenantRaw.bankDetails || null,
          upiId: tenantRaw.bankDetails?.upiId || tenantRaw.settings?.upiId || null,
          phone: studioPhone,
          email: studioEmail,
        },
        address: branchRaw?.address || tenantRaw.address || null,
        phone: studioPhone,
        email: studioEmail,
        website: tenantRaw.website || null,
        gstNumber: branchRaw?.gstNumber || tenantRaw.gstNumber || null,
        bankDetails: tenantRaw.bankDetails || null,
        defaultPortfolioUrls,
        defaultPromoVideoUrl: defaultPromo || null,
        whyChooseUs,
      } : null,
      branch: branchRaw ? {
        id: branchRaw.id,
        name: branchRaw.name,
        phone: branchRaw.phone || null,
        email: branchRaw.email || null,
        address: branchRaw.address || null,
        city: branchRaw.city || null,
        state: branchRaw.state || null,
      } : null,
      notes: (dto as any).notes || quotationRaw.notes || quotationRaw.quotationRevisions?.[0]?.revisionComment || null,
      lead: {
        id: dto.lead?.id,
        leadCode: dto.lead?.leadCode,
        eventType: dto.lead?.eventType,
        customer: dto.lead?.customer ? {
          firstName: dto.lead.customer.firstName,
          lastName: dto.lead.customer.lastName,
          name: dto.lead.customer.name,
          email: dto.lead.customer.email,
          phone: dto.lead.customer.phone,
        } : null,
      },
    };

    return { success: true, data: serializePrisma(sanitizedDto) };
  } catch (error: any) {
    console.error('[GET_PUBLIC_QUOTATION_ERROR]', error);
    return { success: false, error: 'Failed to load quotation' };
  }
}

/**
 * Client Acceptance Action:
 * Executes the strict transaction logic:
 * 1. Verifies quotation exists and is in a valid state (DRAFT or SENT or VIEWED).
 * 2. Updates Quotation status to ACCEPTED.
 * 3. Updates associated Lead status to WON.
 * 4. Updates linked Customer to isConfirmed = true, assigns portalAccessCode, and sets confirmedAt.
 * 5. Logs audit and activity milestones.
 */
export async function acceptQuotation(
  quotationId: string,
  clientNotes?: string,
  acceptanceData?: QuotationAcceptanceInput
): Promise<ActionResponse<{ quotationId: string; status: string; bookingId?: string; bookingNumber?: string; invoiceNumber?: string }>> {
  try {
    if (!quotationId) {
      return { success: false, error: 'Quotation ID is required' };
    }

    // Resolve client IP address from request headers
    let clientIpAddress = '127.0.0.1';
    try {
      const headerList = await headers();
      clientIpAddress =
        headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headerList.get('x-real-ip') ||
        '127.0.0.1';
    } catch {
      // Fallback if headers() unavailable
    }

    const acceptedAt = new Date();
    const acceptanceTerms =
      acceptanceData?.acceptanceTerms ||
      'I have reviewed the deliverables and agree to the payment schedule and studio policies stated in this proposal.';
    const clientSignature = acceptanceData?.clientSignature || undefined;

    // Execute atomic 1-Click Quotation-to-Booking handoff
    const result = await QuotationHandoffService.processQuotationAcceptance({
      quotationId,
      clientNotes,
      acceptanceData: {
        clientSignature,
        acceptanceTerms,
        clientIpAddress,
        acceptedAt,
      },
    });

    // Revalidate affected Next.js routes
    revalidatePath(`/quote/${quotationId}`);
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath(`/sales/quotations/${quotationId}/print`);
    revalidatePath('/sales/quotations');
    if (result.lead?.id) {
      revalidatePath(`/leads/${result.lead.id}`);
    }
    revalidatePath('/leads');
    revalidatePath('/customers');
    revalidatePath('/operations/calendar');
    revalidatePath('/operations/bookings');

    return {
      success: true,
      message: result.isIdempotentReplay
        ? 'This quotation has already been accepted and confirmed.'
        : 'Quotation accepted and booking successfully confirmed!',
      data: {
        quotationId,
        status: 'ACCEPTED',
        bookingId: result.booking?.id,
        bookingNumber: result.booking?.bookingNumber,
        invoiceNumber: result.invoice?.invoiceNumber,
      },
    };
  } catch (error: any) {
    console.error('[ACCEPT_QUOTATION_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while accepting quotation',
    };
  }
}

/**
 * Client Revision Request Action:
 * Allows the client to request revisions/changes to the proposal.
 * Transitions the Lead to NEGOTIATION status and creates an ActivityTimeline entry.
 */
export async function requestQuotationChanges(
  quotationId: string,
  feedback: string
): Promise<ActionResponse> {
  try {
    if (!quotationId) {
      return { success: false, error: 'Quotation ID is required' };
    }

    if (!feedback || !feedback.trim()) {
      return { success: false, error: 'Please describe the changes or questions you have.' };
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lead: true,
        quotationRevisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!quotation) {
      return { success: false, error: 'Quotation not found' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update quotation status to REJECTED (Prisma enum representing revision needed)
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'REJECTED' },
      });

      // 2. Update latest revision reason with client feedback
      if (quotation.quotationRevisions && quotation.quotationRevisions.length > 0) {
        await tx.quotationRevision.update({
          where: { id: quotation.quotationRevisions[0].id },
          data: {
            status: 'REJECTED',
            revisionReason: feedback.trim(),
          },
        });
      }

      // 3. Transition Lead status to NEGOTIATION
      if (quotation.leadId) {
        await tx.lead.update({
          where: { id: quotation.leadId },
          data: { status: LeadStatus.NEGOTIATION },
        });
      }

      // 4. Log in internal ActivityTimeline for Super Admin to see and act upon
      if (quotation.lead?.tenantId) {
        await tx.activityTimeline.create({
          data: {
            tenantId: quotation.lead.tenantId,
            entityType: 'LEAD',
            entityId: quotation.leadId,
            action: 'REVISION_REQUESTED',
            notes: feedback.trim(),
            metadata: {
              quotationId,
              feedback: feedback.trim(),
              requestedAt: new Date().toISOString(),
            },
          },
        });
      }
    });

    revalidatePath(`/quote/${quotationId}`);
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath('/sales/quotations');
    revalidatePath('/leads');
    if (quotation.leadId) {
      revalidatePath(`/leads/${quotation.leadId}`);
    }

    return {
      success: true,
      data: { quotationId },
      message: 'Your revision request has been submitted to the studio team.',
    };
  } catch (error: any) {
    console.error('[REQUEST_QUOTATION_CHANGES_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to submit changes request',
    };
  }
}
