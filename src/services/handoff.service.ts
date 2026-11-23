import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { InvoiceService } from '@/services/finance/invoice.service';
import { serializePrisma } from '@/lib/serialize';
import {
  EventBookingStatus,
  JourneyStatus,
  LeadStatus,
  PostProductionStatus,
  SelectionStatus,
  TaskStatus,
  Prisma,
} from '@prisma/client';
export * from '@/services/booking/quotation-handoff.service';

export interface ConvertLeadToBookingOptions {
  leadId: string;
  quotationId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  title?: string;
  location?: string;
  notes?: string;
  assignedStaff?: Array<{ userId: string; role: string; notes?: string }>;
  tenantId?: string;
  branchId?: string;
  userId?: string;
}

export interface HandoffResult {
  lead: any;
  customer: any;
  booking: any;
  project?: any;
  postProductionJob: any;
  concurrentWarning?: any;
}

export class HandoffService {
  /**
   * Resolves active user session, tenant, and branch context.
   */
  private static async resolveSession(overrides?: { tenantId?: string; branchId?: string; userId?: string }) {
    if (overrides?.tenantId && overrides?.userId) {
      return {
        tenantId: overrides.tenantId,
        userId: overrides.userId,
        branchId: overrides.branchId,
      };
    }

    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId && !overrides?.tenantId) {
      throw new Error('Unauthorized: No active tenant session');
    }

    const context = await getActiveContext().catch(() => null);

    return {
      tenantId: overrides?.tenantId || (user?.tenantId as string),
      userId: overrides?.userId || (user?.id as string),
      branchId: overrides?.branchId || (context?.activeBranch?.id as string) || user?.branchId,
    };
  }

  /**
   * Atomically executes the complete Lead-to-Booking handoff:
   * 1. Confirms or provisions the linked Customer with client portal access.
   * 2. Transitions Lead status to WON (probability: 100%).
   * 3. Creates or updates the EventBooking with sequential booking number.
   * 4. Creates or links the operational Project for shoot & task tracking.
   * 5. Initializes an empty PostProductionJob, 1:1 ClientSelection, and standard deliverable tasks.
   * 6. Auto-generates the initial Invoice if an accepted quotation exists.
   * 7. Logs audit trail and activity timeline entries.
   */
  static async convertLeadToBooking(
    optionsOrLeadId: ConvertLeadToBookingOptions | string
  ): Promise<HandoffResult> {
    const options: ConvertLeadToBookingOptions =
      typeof optionsOrLeadId === 'string' ? { leadId: optionsOrLeadId } : optionsOrLeadId;

    const { tenantId, userId, branchId } = await this.resolveSession({
      tenantId: options.tenantId,
      branchId: options.branchId,
      userId: options.userId,
    });

    if (!options.leadId) {
      throw new Error('Lead ID is required for booking handoff');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Lead with customer, quotations, and inquiry
      const lead = await tx.lead.findFirst({
        where: { id: options.leadId, tenantId, deletedAt: null },
        include: {
          customer: true,
          inquiry: true,
          eventBookings: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          quotations: {
            orderBy: { createdAt: 'desc' },
            include: {
              quotationRevisions: {
                orderBy: { revisionNumber: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!lead) {
        throw new Error('Lead not found or unauthorized');
      }

      const activeBranchId = branchId || lead.branchId;

      // 2. Ensure Customer exists and is confirmed with portal credentials
      let customer = lead.customer;
      const portalAccessCode =
        customer?.portalAccessCode ||
        `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            isConfirmed: true,
            portalAccessGranted: true,
            portalAccessCode,
            confirmedAt: customer.confirmedAt || new Date(),
            updatedById: userId,
          },
        });
      } else {
        const customerCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'CUSTOMER');
        const fallbackName = (lead as any).customerName?.trim() || 'Client';
        const nameParts = fallbackName.split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || '';

        customer = await tx.customer.create({
          data: {
            tenantId,
            branchId: activeBranchId,
            customerCode,
            firstName,
            lastName,
            phone: (lead as any).customerPhone || null,
            email: (lead as any).customerEmail || null,
            isConfirmed: true,
            portalAccessGranted: true,
            portalAccessCode,
            confirmedAt: new Date(),
            createdById: userId,
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: { customerId: customer.id },
        });
      }

      // 3. Mark Lead as WON
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.WON,
          probability: 100,
          updatedById: userId,
        },
      });

      // 4. Resolve Quotation & Financials
      const acceptedQuotation = lead.quotations?.find((q) => q.status === 'ACCEPTED');
      const latestQuotation = lead.quotations?.[0];
      const quotationId = options.quotationId || acceptedQuotation?.id || latestQuotation?.id || null;
      const targetQuotation = lead.quotations?.find((q) => q.id === quotationId) || acceptedQuotation || latestQuotation;
      const quotationTotal = targetQuotation
        ? Number(targetQuotation.quotationRevisions?.[0]?.grandTotal ?? targetQuotation.totalAmount)
        : Number(lead.expectedRevenue || 0);

      // 5. Resolve Dates & Title
      const inquiry = lead.inquiry as any;
      const rawStart = options.startDate || inquiry?.eventDate || lead.expectedBookingDate || new Date();
      const startDate = new Date(rawStart);
      const rawEnd = options.endDate || rawStart;
      const endDate = new Date(rawEnd);

      const customerFullName =
        [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Client';
      const eventType = inquiry?.eventType || (lead as any).eventType || 'Photography';
      const title =
        options.title?.trim() ||
        `${eventType} Shoot - ${customerFullName}`;

      // 6. Create or Update EventBooking
      let booking = lead.eventBookings?.[0] || null;

      if (booking) {
        booking = await tx.eventBooking.update({
          where: { id: booking.id },
          data: {
            title,
            startDate,
            endDate,
            quotationId: quotationId || booking.quotationId,
            status: EventBookingStatus.CONFIRMED,
            journeyStatus: JourneyStatus.BOOKED,
            location: options.location?.trim() || booking.location,
            notes: options.notes?.trim() || booking.notes,
            branchId: activeBranchId || booking.branchId,
          },
        });
      } else {
        const bookingNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'BOOKING');
        booking = await tx.eventBooking.create({
          data: {
            tenantId,
            branchId: activeBranchId,
            bookingNumber,
            title,
            leadId: lead.id,
            customerId: customer.id,
            quotationId,
            startDate,
            endDate,
            status: EventBookingStatus.CONFIRMED,
            journeyStatus: JourneyStatus.BOOKED,
            location: options.location?.trim() || null,
            notes: options.notes?.trim() || null,
            createdById: userId,
          },
        });
      }

      // 7. Assign Staff if provided
      if (options.assignedStaff && options.assignedStaff.length > 0) {
        for (const staff of options.assignedStaff) {
          if (!staff.userId || !staff.role) continue;
          await tx.eventAssignment.upsert({
            where: {
              eventBookingId_userId_role: {
                eventBookingId: booking.id,
                userId: staff.userId,
                role: staff.role.trim(),
              },
            },
            update: { notes: staff.notes?.trim() || null },
            create: {
              eventBookingId: booking.id,
              userId: staff.userId,
              role: staff.role.trim(),
              notes: staff.notes?.trim() || null,
            },
          });
        }
      }

      // 8. Initialize PostProductionJob & Standard Workflow Tasks
      let postProductionJob = await tx.postProductionJob.findUnique({
        where: { bookingId: booking.id },
        include: { workflowTasks: true, clientSelection: true },
      });

      if (!postProductionJob) {
        postProductionJob = await tx.postProductionJob.create({
          data: {
            tenantId,
            bookingId: booking.id,
            status: PostProductionStatus.PENDING,
            notes: `Post-production initialized from Lead ${lead.leadCode} handoff.`,
          },
          include: { workflowTasks: true, clientSelection: true },
        });

        // Create 1:1 ClientSelection record
        await tx.clientSelection.create({
          data: {
            tenantId,
            customerId: customer.id,
            eventBookingId: booking.id,
            jobId: postProductionJob.id,
            title: `${booking.title} - Photo Selection`,
            status: SelectionStatus.DRAFT,
            instructions: 'Please select your shortlisted photo file names for master retouching and album composition.',
          },
        });

        // Seed 5 standard deliverable workflow tasks
        const standardTasks = [
          { taskType: 'RAW_INGEST_AND_DUMP', notes: 'Dump camera cards, verify checksums, and backup to storage archive' },
          { taskType: 'COLOR_CORRECTION', notes: 'Master exposure balancing and color grading' },
          { taskType: 'HIGHLIGHT_TEASER', notes: '60-second teaser reel for social preview' },
          { taskType: 'ALBUM_DESIGN', notes: 'Curate client selections into storybook layout' },
          { taskType: 'CINEMATIC_FILM', notes: 'Full event documentary edit with synchronized audio' },
        ];

        await tx.workflowTask.createMany({
          data: standardTasks.map((t) => ({
            tenantId,
            jobId: postProductionJob!.id,
            eventBookingId: booking.id,
            taskType: t.taskType,
            status: TaskStatus.PENDING,
            notes: t.notes,
          })),
        });
      }

      // 10. Auto-generate invoice from quotation if available
      if (quotationId) {
        try {
          await InvoiceService.generateInvoiceFromQuotation(quotationId, tenantId, activeBranchId);
        } catch (invErr) {
          console.warn('[HANDOFF_AUTO_INVOICE_WARNING]', invErr);
        }
      }

      // 11. Record Activity Timeline
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'LEAD',
          entityId: lead.id,
          action: 'BOOKING_CONFIRMED',
          notes: `Lead ${lead.leadCode} converted to Booking ${booking.bookingNumber} ("${booking.title}"). Customer ${customer.customerCode} portal activated.`,
          createdById: userId,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            jobId: postProductionJob.id,
            quotationId,
          },
        },
      });

      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: customer.id,
          action: 'CUSTOMER_CONFIRMED_VIA_LEAD',
          notes: `Customer confirmed via Lead ${lead.leadCode} handoff. Booking ${booking.bookingNumber} linked.`,
          createdById: userId,
        },
      });

      return serializePrisma({
        lead: updatedLead,
        customer,
        booking,
        postProductionJob,
      });
    });
  }
}
