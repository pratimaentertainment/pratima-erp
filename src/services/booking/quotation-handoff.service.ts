import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { serializePrisma, SerializedPrisma } from '@/lib/serialize';
import {
  EventBookingStatus,
  JourneyStatus,
  LeadStatus,
  PostProductionStatus,
  SelectionStatus,
  TaskStatus,
  Prisma,
  Quotation,
  Lead,
  Customer,
  EventBooking,
  SubEvent,
  Invoice,
  PostProductionJob,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

export class QuotationHandoffError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'HANDOFF_ERROR', statusCode = 400) {
    super(message);
    this.name = 'QuotationHandoffError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface QuotationHandoffOptions {
  quotationId: string;
  tenantId?: string;
  branchId?: string;
  userId?: string;
  clientNotes?: string;
  acceptanceData?: {
    clientSignature?: string;
    acceptanceTerms?: string;
    clientIpAddress?: string;
    acceptedAt?: Date | string;
  };
}

export type QuotationHandoffResult = SerializedPrisma<{
  quotation: Quotation;
  lead: Lead | null;
  customer: Customer;
  booking: EventBooking;
  subEvents: SubEvent[];
  invoice: Invoice | null;
  postProductionJob?: PostProductionJob | null;
  isIdempotentReplay?: boolean;
}>;

export class QuotationHandoffService {
  /**
   * Resolves active user session, tenant, and branch context.
   * Supports both authenticated operators and public client acceptance.
   */
  private static async resolveSession(overrides?: {
    tenantId?: string;
    branchId?: string;
    userId?: string;
  }) {
    if (overrides?.tenantId && overrides?.userId) {
      return {
        tenantId: overrides.tenantId,
        userId: overrides.userId,
        branchId: overrides.branchId,
      };
    }

    try {
      const session = await auth();
      const user = session?.user as { tenantId?: string; id?: string; branchId?: string } | undefined;
      const context = (await getActiveContext().catch(() => null)) as { activeTenant?: { id: string }; tenantId?: string; activeBranch?: { id: string } } | null;

      return {
        tenantId:
          overrides?.tenantId ||
          user?.tenantId ||
          context?.activeTenant?.id ||
          context?.tenantId ||
          null,
        userId: overrides?.userId || user?.id || null,
        branchId: overrides?.branchId || context?.activeBranch?.id || user?.branchId || null,
      };
    } catch {
      return {
        tenantId: overrides?.tenantId || null,
        userId: overrides?.userId || null,
        branchId: overrides?.branchId || null,
      };
    }
  }

  /**
   * Atomically executes the complete 1-Click Quotation-to-Booking handoff:
   * 1. Validates quotation existence, tenant ownership, and idempotency status.
   * 2. Opens a strict Prisma $transaction:
   *    a. Transitions Quotation status to ACCEPTED with client signature & IP metadata.
   *    b. Synchronizes latest QuotationRevision status to ACCEPTED.
   *    c. Transitions linked Lead status to WON (probability: 100%).
   *    d. Confirms or provisions Customer with portal access credentials.
   *    e. Creates or links the primary Invoice with line items from quotation.
   *    f. Creates confirmed EventBooking uniquely linked (1:1) to quotationId.
   *    g. Creates SubEvents for each wedding/event function from QuotationFunction records.
   *    h. Initializes PostProductionJob, standard deliverable tasks, and ClientSelection proofing.
   *    i. Records ActivityTimeline and AuditLog records for complete enterprise traceability.
   * 3. Rolls back cleanly if any operation fails.
   */
  public static async processQuotationAcceptance(
    options: QuotationHandoffOptions
  ): Promise<QuotationHandoffResult> {
    if (!options.quotationId) {
      throw new QuotationHandoffError('Quotation ID is required for handoff', 'INVALID_INPUT', 400);
    }

    const sessionInfo = await this.resolveSession({
      tenantId: options.tenantId,
      branchId: options.branchId,
      userId: options.userId,
    });

    // 1. Fetch full quotation graph prior to transaction for validation
    const quotation = await prisma.quotation.findUnique({
      where: { id: options.quotationId },
      include: {
        lead: {
          include: {
            customer: true,
            inquiry: true,
            tenant: true,
            branch: true,
          },
        },
        quotationRevisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            items: true,
          },
        },
        functions: {
          include: {
            items: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        deliverables: true,
        invoice: {
          include: {
            items: true,
          },
        },
        eventBooking: {
          include: {
            subEvents: true,
            postProductionJob: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new QuotationHandoffError(`Quotation ${options.quotationId} not found`, 'QUOTATION_NOT_FOUND', 404);
    }

    const resolvedTenantId =
      sessionInfo.tenantId ||
      quotation.lead?.tenantId ||
      quotation.quotationRevisions?.[0]?.tenantId;

    if (!resolvedTenantId) {
      throw new QuotationHandoffError('Tenant ID could not be resolved for this quotation', 'UNAUTHORIZED', 401);
    }

    // Tenant boundary check if caller explicitly provided tenantId
    if (sessionInfo.tenantId && quotation.lead?.tenantId && sessionInfo.tenantId !== quotation.lead.tenantId) {
      throw new QuotationHandoffError('Access denied: Tenant boundary mismatch', 'FORBIDDEN', 403);
    }

    const resolvedBranchId =
      sessionInfo.branchId ||
      quotation.lead?.branchId ||
      quotation.quotationRevisions?.[0]?.branchId;

    const resolvedUserId = sessionInfo.userId;

    // Idempotency check: If quotation already has an active EventBooking and is ACCEPTED
    if (quotation.status === 'ACCEPTED' && quotation.eventBooking) {
      return serializePrisma({
        quotation,
        lead: quotation.lead,
        customer: quotation.lead?.customer,
        booking: quotation.eventBooking,
        subEvents: quotation.eventBooking.subEvents || [],
        invoice: quotation.invoice,
        postProductionJob: quotation.eventBooking.postProductionJob,
        isIdempotentReplay: true,
      });
    }

    // 2. Execute Atomic Prisma Transaction
    return await prisma.$transaction(
      async (tx) => {
        const acceptedAt = options.acceptanceData?.acceptedAt
          ? new Date(options.acceptanceData.acceptedAt)
          : new Date();
        const clientSignature = options.acceptanceData?.clientSignature || quotation.clientSignature || null;
        const clientIpAddress = options.acceptanceData?.clientIpAddress || quotation.clientIpAddress || null;
        const acceptanceTerms =
          options.acceptanceData?.acceptanceTerms ||
          quotation.acceptanceTerms ||
          'I accept the quotation proposal, deliverables, and studio policies.';

        // --- Step A: Update Quotation to ACCEPTED ---
        const updatedQuotation = await tx.quotation.update({
          where: { id: quotation.id },
          data: {
            status: 'ACCEPTED',
            clientSignature,
            acceptedAt,
            clientIpAddress,
            acceptanceTerms,
          },
        });

        // --- Step B: Update Latest QuotationRevision ---
        if (quotation.quotationRevisions && quotation.quotationRevisions.length > 0) {
          await tx.quotationRevision.update({
            where: { id: quotation.quotationRevisions[0].id },
            data: {
              status: 'ACCEPTED',
              clientSignature,
              acceptedAt,
              clientIpAddress,
              acceptanceTerms,
            },
          });
        }

        // --- Step C: Update Lead to WON ---
        type LeadWithCustomerAndInquiry = Prisma.LeadGetPayload<{ include: { customer: true; inquiry: true } }>;
        let updatedLead: LeadWithCustomerAndInquiry | null = quotation.lead as LeadWithCustomerAndInquiry | null;
        if (quotation.leadId) {
          updatedLead = await tx.lead.update({
            where: { id: quotation.leadId },
            data: {
              status: LeadStatus.WON,
              probability: 100,
              ...(resolvedUserId ? { updatedById: resolvedUserId } : {}),
            },
            include: {
              customer: true,
              inquiry: true,
            },
          });
        }

        // --- Step D: Ensure Customer Exists & Confirm Portal Access ---
        let customer: Customer | null = updatedLead?.customer || quotation.lead?.customer || null;
        const portalAccessCode =
          customer?.portalAccessCode ||
          `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        let portalPin = customer?.portalPin;
        if (!portalPin) {
          const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
          portalPin = await bcrypt.hash(rawPin, 10);
        }

        if (customer) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              isConfirmed: true,
              portalAccessGranted: true,
              portalAccessCode,
              portalPin,
              confirmedAt: customer.confirmedAt || new Date(),
              ...(resolvedUserId ? { updatedById: resolvedUserId } : {}),
            },
          });
        } else {
          const customerCode = await NumberSeriesService.getNextNumber(tx, resolvedTenantId, 'CUSTOMER');
          const inquiry = updatedLead?.inquiry;
          const rawCustomerName = 'Valued Client';
          const nameParts = rawCustomerName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Valued';
          const lastName = nameParts.slice(1).join(' ') || 'Client';

          customer = await tx.customer.create({
            data: {
              tenantId: resolvedTenantId,
              branchId: resolvedBranchId || quotation.lead?.branchId,
              customerCode,
              firstName,
              lastName,
              email: null,
              phone: null,
              isConfirmed: true,
              portalAccessGranted: true,
              portalAccessCode,
              portalPin,
              confirmedAt: new Date(),
              ...(resolvedUserId ? { createdById: resolvedUserId } : {}),
            },
          });

          if (quotation.leadId) {
            await tx.lead.update({
              where: { id: quotation.leadId },
              data: { customerId: customer.id },
            });
          }
        }

        // --- Step E: Create or Reuse Primary Invoice ---
        let invoice = quotation.invoice;
        if (!invoice) {
          const latestRev = quotation.quotationRevisions?.[0];
          const items = latestRev?.items || [];

          const subtotal = latestRev?.subtotal ?? quotation.totalAmount;
          const taxAmount = latestRev?.taxAmount ?? new Prisma.Decimal(0);
          const discountAmount = latestRev?.discountAmount ?? new Prisma.Decimal(0);
          const grandTotal = latestRev?.grandTotal ?? quotation.totalAmount;

          const invoiceNumber = await NumberSeriesService.getNextNumber(
            tx,
            resolvedTenantId,
            'INVOICE'
          );
          const issueDate = new Date();
          const dueDate =
            quotation.validUntil ||
            new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

          invoice = await tx.invoice.create({
            data: {
              tenantId: resolvedTenantId,
              branchId: resolvedBranchId || quotation.lead?.branchId,
              customerId: customer.id,
              leadId: quotation.leadId,
              quotationId: quotation.id,
              invoiceNumber,
              status: 'UNPAID',
              subtotal,
              taxAmount,
              discountAmount,
              grandTotal,
              paidAmount: new Prisma.Decimal(0),
              balanceDue: grandTotal,
              issueDate,
              dueDate,
              notes: `Auto-generated on quotation ${quotation.id.slice(0, 8)} acceptance`,
              ...(resolvedUserId ? { createdById: resolvedUserId } : {}),
              items: {
                create: items.map((item) => ({
                  tenantId: resolvedTenantId,
                  itemType: item.lineItemType || 'SERVICE',
                  name: item.itemName,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  taxAmount: item.calculatedTaxAmount,
                  discountAmount: item.calculatedDiscountAmount,
                  totalPrice: item.calculatedTotal,
                })),
              },
            },
            include: {
              items: true,
            },
          });
        }

        // --- Step F: Resolve Booking Dates & Title ---
        const functionDates = (quotation.functions || [])
          .map((f) => (f.date ? new Date(f.date) : null))
          .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());

        const inquiry = updatedLead?.inquiry;
        const fallbackRawDate =
          inquiry?.eventDate ||
          updatedLead?.expectedBookingDate ||
          new Date();
        const fallbackDate = new Date(fallbackRawDate);

        const startDate =
          functionDates.length > 0
            ? functionDates[0]
            : !isNaN(fallbackDate.getTime())
            ? fallbackDate
            : new Date();

        const endDate =
          functionDates.length > 0
            ? functionDates[functionDates.length - 1]
            : startDate;

        const customerFullName =
          [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Client';
        const eventType =
          inquiry?.eventType || 'Photography / Event';
        const bookingTitle = `${eventType} - ${customerFullName}`;
        const bookingNotes =
          options.clientNotes?.trim() ||
          `Confirmed via 1-Click Quotation Acceptance (${quotation.id.slice(0, 8)})`;

        // --- Step G: Create or Link EventBooking ---
        let booking: EventBooking | null = quotation.eventBooking || null;
        if (!booking) {
          const bookingNumber = await NumberSeriesService.getNextNumber(
            tx,
            resolvedTenantId,
            'BOOKING'
          );

          booking = await tx.eventBooking.create({
            data: {
              tenantId: resolvedTenantId,
              branchId: resolvedBranchId || quotation.lead?.branchId,
              bookingNumber,
              title: bookingTitle,
              leadId: quotation.leadId,
              customerId: customer.id,
              quotationId: quotation.id,
              invoiceId: invoice?.id || null,
              startDate,
              endDate,
              status: EventBookingStatus.CONFIRMED,
              journeyStatus: JourneyStatus.BOOKED,
              location: quotation.functions?.[0]?.venue || null,
              notes: bookingNotes,
              ...(resolvedUserId ? { createdById: resolvedUserId } : {}),
            },
          });
        } else {
          booking = await tx.eventBooking.update({
            where: { id: booking.id },
            data: {
              status: EventBookingStatus.CONFIRMED,
              journeyStatus: JourneyStatus.BOOKED,
              invoiceId: invoice?.id || booking.invoiceId,
              quotationId: quotation.id,
              customerId: customer.id,
            },
          });
        }

        if (!booking) {
          throw new QuotationHandoffError(
            'Failed to initialize or retrieve EventBooking record',
            'BOOKING_INIT_FAILED'
          );
        }

        // --- Step H: Create SubEvents for Quotation Functions ---
        const createdSubEvents: SubEvent[] = [];
        if (quotation.functions && quotation.functions.length > 0) {
          for (const func of quotation.functions) {
            const subEventDate = func.date ? new Date(func.date) : startDate;
            const subEvent = await tx.subEvent.create({
              data: {
                tenantId: resolvedTenantId,
                eventBookingId: booking.id,
                name: func.name || 'Event Function',
                eventDate: subEventDate,
                startTime: '09:00',
                endTime: '18:00',
                locationVenue: func.venue || booking.location || null,
                notes: `Function from Quotation: ${func.name}`,
              },
            });
            createdSubEvents.push(subEvent);
          }
        } else {
          // Provision fallback primary SubEvent
          const subEvent = await tx.subEvent.create({
            data: {
              tenantId: resolvedTenantId,
              eventBookingId: booking.id,
              name: bookingTitle,
              eventDate: startDate,
              startTime: '09:00',
              endTime: '18:00',
              locationVenue: booking.location || null,
              notes: 'Primary event session created during quotation handoff',
            },
          });
          createdSubEvents.push(subEvent);
        }

        // --- Step I: Initialize PostProductionJob, Workflow Tasks, & ClientSelection ---
        let postProductionJob = await tx.postProductionJob.findUnique({
          where: { bookingId: booking.id },
          include: { workflowTasks: true, clientSelection: true },
        });

        if (!postProductionJob) {
          postProductionJob = await tx.postProductionJob.create({
            data: {
              tenantId: resolvedTenantId,
              bookingId: booking.id,
              status: PostProductionStatus.PENDING,
              notes: `Post-production initialized from Quotation ${quotation.id.slice(0, 8)} handoff.`,
            },
            include: { workflowTasks: true, clientSelection: true },
          });

          await tx.clientSelection.create({
            data: {
              tenantId: resolvedTenantId,
              customerId: customer.id,
              eventBookingId: booking.id,
              jobId: postProductionJob.id,
              title: `${booking.title} - Photo Selection`,
              status: SelectionStatus.DRAFT,
              instructions:
                'Please review and shortlist your favorite photos for master retouching and album composition.',
            },
          });

          const standardTasks = [
            {
              taskType: 'RAW_INGEST_AND_DUMP',
              notes: 'Camera memory card backup and checksum verification',
            },
            {
              taskType: 'COLOR_CORRECTION',
              notes: 'Exposure balancing, skin tone correction, and color grading',
            },
            {
              taskType: 'HIGHLIGHT_TEASER',
              notes: '60-second social media preview teaser',
            },
            {
              taskType: 'ALBUM_DESIGN',
              notes: 'Photo selection curation and storybook album layout',
            },
            {
              taskType: 'CINEMATIC_FILM',
              notes: 'Full documentary event film edit with synced audio',
            },
          ];

          await tx.workflowTask.createMany({
            data: standardTasks.map((t) => ({
              tenantId: resolvedTenantId,
              jobId: postProductionJob!.id,
              eventBookingId: booking.id,
              taskType: t.taskType,
              status: TaskStatus.PENDING,
              notes: t.notes,
            })),
          });
        }

        // --- Step J: Enterprise Audit Trail & Activity Timeline ---
        if (quotation.leadId) {
          await tx.activityTimeline.create({
            data: {
              tenantId: resolvedTenantId,
              entityType: 'LEAD',
              entityId: quotation.leadId,
              action: 'QUOTATION_ACCEPTED_HANDOFF',
              notes: `Quotation accepted online. Booking ${booking.bookingNumber} created, Invoice ${invoice.invoiceNumber} generated, and Lead marked WON.`,
              metadata: {
                quotationId: quotation.id,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                subEventsCount: createdSubEvents.length,
                hasSignature: !!clientSignature,
              },
              ...(resolvedUserId ? { createdById: resolvedUserId } : {}),
            },
          });
        }

        await tx.activityTimeline.create({
          data: {
            tenantId: resolvedTenantId,
            entityType: 'CUSTOMER',
            entityId: customer.id,
            action: 'CUSTOMER_CONFIRMED_VIA_QUOTATION',
            notes: `Customer confirmed via 1-Click Quotation handoff. Booking ${booking.bookingNumber} linked.`,
            ...(resolvedUserId ? { createdById: resolvedUserId } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: resolvedTenantId,
            action: 'QUOTATION_HANDOFF_SUCCESS',
            entityType: 'EventBooking',
            entityId: booking.id,
            newValues: {
              quotationId: quotation.id,
              bookingNumber: booking.bookingNumber,
              invoiceNumber: invoice.invoiceNumber,
              customerId: customer.id,
            },
            ...(resolvedUserId ? { userId: resolvedUserId } : {}),
          },
        });

        return serializePrisma({
          quotation: updatedQuotation,
          lead: updatedLead,
          customer,
          booking,
          subEvents: createdSubEvents,
          invoice,
          postProductionJob,
          isIdempotentReplay: false,
        });
      },
      { timeout: 20000 }
    );
  }
}
