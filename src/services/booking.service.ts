import { prisma } from '@/lib/prisma';
import {
  EventBookingStatus,
  JourneyStatus,
  PostProductionStatus,
  SelectionStatus,
  TaskStatus,
  GearAllocationStatus,
  AssetStatus,
  StaffAssignmentStatus,
  Prisma,
} from '@prisma/client';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { InvoiceService } from '@/services/finance/invoice.service';
import { serializePrisma } from '@/lib/serialize';

export interface ConcurrentEventStaff {
  userId: string;
  name: string;
  email?: string | null;
  role: string;
}

export interface ConcurrentEventDetail {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
  location?: string | null;
  customerName: string;
  customerPhone?: string | null;
  assignedStaff: ConcurrentEventStaff[];
}

export interface ConcurrentWarningPayload {
  hasConcurrentEvents: boolean;
  totalConcurrent: number;
  events: ConcurrentEventDetail[];
  warningMessage: string | null;
}

export interface AssignedStaffInput {
  userId: string;
  role: string;
  notes?: string;
}

export interface CreateOrConfirmBookingParams {
  leadId: string;
  quotationId?: string;
  dates?: {
    startDate: Date | string;
    endDate?: Date | string;
  };
  startDate?: Date | string;
  endDate?: Date | string;
  title?: string;
  location?: string;
  notes?: string;
  assignedStaff?: AssignedStaffInput[];
  tenantId?: string;
  branchId?: string;
  userId?: string;
}

export interface CreateManualBookingParams {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  title: string;
  startDate: Date | string;
  endDate?: Date | string;
  location?: string;
  notes?: string;
  status?: EventBookingStatus;
  journeyStatus?: JourneyStatus;
  branchId?: string;
  assignedStaff?: AssignedStaffInput[];
  totalAmount?: number;
  createProject?: boolean;
  tenantId?: string;
  userId?: string;
}

export interface UpdateBookingParams {
  id: string;
  title?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  location?: string | null;
  notes?: string | null;
  status?: EventBookingStatus;
  journeyStatus?: JourneyStatus;
  branchId?: string;
  assignedStaff?: AssignedStaffInput[];
  tenantId?: string;
  userId?: string;
}

export class BookingService {
  /**
   * Resolves active session for tenant, user, and branch context.
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
   * Checks for concurrent / overlapping bookings on the given date range.
   * Instead of throwing an error for overlapping dates, returns a rich
   * Concurrent Warning Payload containing all overlapping bookings and
   * the staff currently assigned to them so managers can make an informed decision (Soft Lock).
   */
  static async checkConcurrentEvents(params: {
    startDate: Date | string;
    endDate?: Date | string;
    tenantId?: string;
    branchId?: string;
    excludeBookingId?: string;
  }): Promise<ConcurrentWarningPayload> {
    const { tenantId } = await this.resolveSession({ tenantId: params.tenantId, branchId: params.branchId });

    const start = new Date(params.startDate);
    const end = params.endDate ? new Date(params.endDate) : new Date(start);

    // If start and end are on the same day without specific time, span the full day
    if (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0) {
      end.setHours(23, 59, 59, 999);
    }

    const overlappingBookings = await prisma.eventBooking.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: [EventBookingStatus.CONFIRMED, EventBookingStatus.BLOCKED] },
        ...(params.excludeBookingId ? { id: { not: params.excludeBookingId } } : {}),
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        subEvents: {
          include: {
            staffAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const events: ConcurrentEventDetail[] = overlappingBookings.map((b) => {
      const staffMap = new Map<string, ConcurrentEventStaff>();

      // Direct EventAssignment records
      b.assignments?.forEach((asg: any) => {
        if (asg.user) {
          staffMap.set(`${asg.userId}-${asg.role}`, {
            userId: asg.userId,
            name: asg.user.name || 'Staff Member',
            email: asg.user.email,
            role: asg.role,
          });
        }
      });

      // SubEvent staff assignments
      b.subEvents?.forEach((se: any) => {
        se.staffAssignments?.forEach((sa: any) => {
          if (sa.user) {
            staffMap.set(`${sa.userId}-${sa.role}`, {
              userId: sa.userId,
              name: sa.user.name || 'Staff Member',
              email: sa.user.email,
              role: sa.role,
            });
          }
        });
      });

      const customerName =
        [b.customer?.firstName, b.customer?.lastName].filter(Boolean).join(' ').trim() ||
        'Client';

      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        title: b.title,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        location: b.location,
        customerName,
        customerPhone: b.customer?.phone || null,
        assignedStaff: Array.from(staffMap.values()),
      };
    });

    const totalConcurrent = events.length;
    const hasConcurrentEvents = totalConcurrent > 0;
    const warningMessage = hasConcurrentEvents
      ? `Note: There is another booking on this date. You can still proceed.`
      : null;

    return serializePrisma({
      hasConcurrentEvents,
      totalConcurrent,
      events,
      warningMessage,
    });
  }

  /**
   * Converts a WON lead into a confirmed EventBooking with concurrent event soft-locking.
   * 1. Validates or updates lead status to WON.
   * 2. Auto-provisions or confirms the linked Customer.
   * 3. Creates or updates the EventBooking with sequential booking number.
   * 4. Persists EventAssignment records for allocated crew.
   * 5. Auto-generates an invoice if a quotation is present.
   * 6. Returns the confirmed booking along with the concurrent warning payload.
   */
  static async createOrConfirmBooking(params: CreateOrConfirmBookingParams) {
    const { tenantId, userId, branchId } = await this.resolveSession({
      tenantId: params.tenantId,
      branchId: params.branchId,
      userId: params.userId,
    });

    // Resolve dates
    const rawStart = params.startDate || params.dates?.startDate;
    if (!rawStart) {
      throw new Error('Start date is required to confirm booking');
    }
    const startDate = new Date(rawStart);
    const rawEnd = params.endDate || params.dates?.endDate || rawStart;
    const endDate = new Date(rawEnd);

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the lead
      const lead = await tx.lead.findFirst({
        where: { id: params.leadId, tenantId },
        include: {
          customer: true,
          inquiry: true,
          quotations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!lead) {
        throw new Error('Lead not found or unauthorized');
      }

      // 2. Ensure customer exists, is confirmed, and has secure portal credentials
      const customer = lead.customer;
      const portalAccessCode =
        customer.portalAccessCode ||
        `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          isConfirmed: true,
          portalAccessGranted: true,
          portalAccessCode,
          confirmedAt: customer.confirmedAt || new Date(),
        },
      });

      // 3. Transition Lead to WON
      if (lead.status !== 'WON') {
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: 'WON' },
        });
      }

      // 4. Resolve Quotation ID
      const quotationId =
        params.quotationId ||
        lead.quotations?.find((q) => q.status === 'ACCEPTED')?.id ||
        lead.quotations?.[0]?.id ||
        null;

      // 5. Booking Title
      const inquiry = lead.inquiry as any;
      const customerFullName =
        [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Client';
      const eventType = inquiry?.eventType || 'Photography';
      const title =
        params.title?.trim() ||
        `${eventType} Shoot - ${customerFullName}`;

      // 6. Check if an EventBooking already exists for this lead
      let booking = await tx.eventBooking.findFirst({
        where: {
          leadId: lead.id,
          tenantId,
          deletedAt: null,
        },
      });

      if (booking) {
        // Update existing booking
        booking = await tx.eventBooking.update({
          where: { id: booking.id },
          data: {
            title,
            startDate,
            endDate,
            quotationId: quotationId || booking.quotationId,
            status: EventBookingStatus.CONFIRMED,
            journeyStatus: JourneyStatus.BOOKED,
            location: params.location?.trim() || booking.location,
            notes: params.notes?.trim() || booking.notes,
            branchId: branchId || booking.branchId,
          },
        });
      } else {
        // Create new EventBooking with sequential number
        const bookingNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'BOOKING');

        booking = await tx.eventBooking.create({
          data: {
            tenantId,
            branchId: branchId || lead.branchId,
            bookingNumber,
            title,
            leadId: lead.id,
            customerId: customer.id,
            quotationId,
            startDate,
            endDate,
            status: EventBookingStatus.CONFIRMED,
            journeyStatus: JourneyStatus.BOOKED,
            location: params.location?.trim() || null,
            notes: params.notes?.trim() || null,
            createdById: userId,
          },
        });
      }

      // 7. Persist EventAssignments if staff provided
      if (params.assignedStaff && params.assignedStaff.length > 0) {
        for (const staff of params.assignedStaff) {
          if (!staff.userId || !staff.role) continue;

          await tx.eventAssignment.upsert({
            where: {
              eventBookingId_userId_role: {
                eventBookingId: booking.id,
                userId: staff.userId,
                role: staff.role.trim(),
              },
            },
            update: {
              notes: staff.notes?.trim() || null,
            },
            create: {
              eventBookingId: booking.id,
              userId: staff.userId,
              role: staff.role.trim(),
              notes: staff.notes?.trim() || null,
            },
          });
        }
      }

      // 7.5. Initialize PostProductionJob and ClientSelection if not already present
      let postProductionJob = await tx.postProductionJob.findUnique({
        where: { bookingId: booking.id },
      });

      if (!postProductionJob) {
        postProductionJob = await tx.postProductionJob.create({
          data: {
            tenantId,
            bookingId: booking.id,
            status: PostProductionStatus.PENDING,
            notes: `Post-production initialized for booking ${booking.bookingNumber} (${booking.title}).`,
          },
        });

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

        const defaultTasks = [
          { taskType: 'RAW_INGEST_AND_DUMP', notes: 'Dump all camera cards, checksum verify & generate proxies' },
          { taskType: 'COLOR_CORRECTION', notes: 'Master color grading and exposure balancing across all shots' },
          { taskType: 'HIGHLIGHT_TEASER', notes: '60-second teaser reel for social media & client preview' },
          { taskType: 'ALBUM_DESIGN', notes: 'Photo selection curation & storybook album layout design' },
          { taskType: 'CINEMATIC_FILM', notes: 'Full cinematic event film with audio mixing' },
        ];

        await tx.workflowTask.createMany({
          data: defaultTasks.map((t) => ({
            tenantId,
            jobId: postProductionJob!.id,
            eventBookingId: booking.id,
            taskType: t.taskType,
            status: TaskStatus.PENDING,
            notes: t.notes,
          })),
        });
      }

      // 8. Auto-generate invoice if quotation exists
      if (quotationId) {
        try {
          await InvoiceService.generateInvoiceFromQuotation(quotationId, tenantId, branchId || lead.branchId);
        } catch (invError) {
          console.error('[AUTO_INVOICE_GENERATION_NON_FATAL]', invError);
        }
      }

      // 9. Record in ActivityTimeline
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'LEAD',
          entityId: lead.id,
          action: 'BOOKING_CONFIRMED',
          notes: `Event booking ${booking.bookingNumber} ("${booking.title}") confirmed for dates ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}. Lead marked WON.`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            quotationId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            assignedStaffCount: params.assignedStaff?.length || 0,
          },
        },
      });

      // 10. Fetch concurrent warning payload for the confirmed dates
      const concurrentWarning = await BookingService.checkConcurrentEvents({
        tenantId,
        startDate,
        endDate,
        excludeBookingId: booking.id,
      });

      return serializePrisma({
        booking,
        concurrentWarning,
      });
    });
  }

  /**
   * Retrieves fully-hydrated booking voucher details for printing, PDF generation,
   * or sharing on WhatsApp.
   */
  static async getBookingVoucherData(bookingId: string, tenantId?: string) {
    const booking = await prisma.eventBooking.findFirst({
      where: { id: bookingId, ...(tenantId ? { tenantId } : {}), deletedAt: null },
      include: {
        customer: true,
        tenant: true,
        quotation: {
          include: {
            quotationRevisions: {
              orderBy: { revisionNumber: 'desc' },
              take: 1,
              include: {
                items: true,
              },
            },
          },
        },
        invoice: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!booking) return null;

    const latestRevision = booking.quotation?.quotationRevisions?.[0];
    const items =
      latestRevision?.items?.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        calculatedTotal: Number(item.calculatedTotal),
      })) || [];

    const customerFullName =
      [booking.customer.firstName, booking.customer.lastName].filter(Boolean).join(' ').trim() ||
      'Client';

    return serializePrisma({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      title: booking.title,
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
      journeyStatus: booking.journeyStatus,
      location: booking.location,
      notes: booking.notes,
      createdAt: booking.createdAt,
      customer: {
        id: booking.customer.id,
        customerCode: booking.customer.customerCode,
        name: customerFullName,
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        phone: booking.customer.phone,
        email: booking.customer.email,
        portalAccessCode: booking.customer.portalAccessCode,
      },
      tenant: booking.tenant
        ? {
            name: booking.tenant.name,
            tradeName: booking.tenant.tradeName,
            address: booking.tenant.address,
            phone: booking.tenant.phone,
            email: booking.tenant.email,
            website: booking.tenant.website,
            gstNumber: booking.tenant.gstNumber,
            logoUrl: booking.tenant.logoUrl,
            slug: booking.tenant.slug,
            settings: (booking.tenant as any).settings,
          }
        : null,
      quotation: booking.quotation
        ? {
            id: booking.quotation.id,
            quoteNumber: (booking.quotation as any).quoteNumber,
            totalAmount: Number(booking.quotation.totalAmount),
            grandTotal: Number(latestRevision?.grandTotal ?? booking.quotation.totalAmount),
            advanceRequired: (booking.quotation as any).advanceRequired,
            items,
          }
        : null,
      invoice: booking.invoice
        ? {
            id: booking.invoice.id,
            invoiceNumber: booking.invoice.invoiceNumber,
            grandTotal: Number(booking.invoice.grandTotal),
            paidAmount: Number(booking.invoice.paidAmount),
            balanceDue: Number(booking.invoice.balanceDue),
            status: booking.invoice.status,
          }
        : null,
      assignments: (booking.assignments || []).map((a) => ({
        role: a.role,
        user: a.user
          ? {
              name: a.user.name,
              phone: (a.user as any).phone || null,
            }
          : null,
      })),
    });
  }

  /**
   * Creates a confirmed EventBooking for manual walk-in clients (bypassing the Lead pipeline).
   * 1. Resolves or provisions Customer.
   * 2. Generates sequential booking number.
   * 3. Creates EventBooking with status & journeyStatus.
   * 4. Optionally creates linked Project and assigns crew.
   * 5. Atomically initializes PostProductionJob, ClientSelection, and default DeliverableTasks.
   * 6. Checks concurrent event schedule and returns soft-lock warning payload.
   */
  static async createBooking(params: CreateManualBookingParams) {
    const { tenantId, userId, branchId } = await this.resolveSession({
      tenantId: params.tenantId,
      branchId: params.branchId,
      userId: params.userId,
    });

    if (!params.title?.trim()) {
      throw new Error('Booking title is required');
    }

    if (!params.startDate) {
      throw new Error('Start date is required');
    }

    const startDate = new Date(params.startDate);
    const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate);
    const activeBranchId = params.branchId || branchId;

    return await prisma.$transaction(async (tx) => {
      // 1. Resolve Customer
      let customer: any = null;

      if (params.customerId) {
        customer = await tx.customer.findFirst({
          where: { id: params.customerId, tenantId, deletedAt: null },
        });

        if (!customer) {
          throw new Error('Customer not found or unauthorized');
        }

        const portalAccessCode =
          customer.portalAccessCode ||
          `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
        const rawName = (params.customerName || '').trim();
        const rawPhone = (params.customerPhone || '').trim();
        const rawEmail = (params.customerEmail || '').trim().toLowerCase();

        if (!rawName && !rawPhone) {
          throw new Error('Customer name or phone is required for walk-in client');
        }

        // Check if an existing customer with the same phone or email exists
        if (rawPhone || rawEmail) {
          customer = await tx.customer.findFirst({
            where: {
              tenantId,
              deletedAt: null,
              OR: [
                ...(rawPhone ? [{ phone: rawPhone }] : []),
                ...(rawEmail ? [{ email: rawEmail }] : []),
              ],
            },
          });
        }

        if (customer) {
          const portalAccessCode =
            customer.portalAccessCode ||
            `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
          const nameParts = rawName ? rawName.split(' ') : ['Walk-in', 'Client'];
          const firstName = nameParts[0] || 'Walk-in';
          const lastName = nameParts.slice(1).join(' ') || 'Client';

          customer = await tx.customer.create({
            data: {
              tenantId,
              branchId: activeBranchId,
              customerCode,
              firstName,
              lastName,
              phone: rawPhone || null,
              email: rawEmail || null,
              isConfirmed: true,
              portalAccessGranted: true,
              portalAccessCode: `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              confirmedAt: new Date(),
              createdById: userId,
            },
          });
        }
      }

      // 2. Generate sequential booking number
      const bookingNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'BOOKING');

      // 3. Create EventBooking
      const booking = await tx.eventBooking.create({
        data: {
          tenantId,
          branchId: activeBranchId || customer.branchId,
          bookingNumber,
          title: params.title.trim(),
          customerId: customer.id,
          startDate,
          endDate,
          status: params.status || EventBookingStatus.CONFIRMED,
          journeyStatus: params.journeyStatus || JourneyStatus.BOOKED,
          location: params.location?.trim() || null,
          notes: params.notes?.trim() || null,
          createdById: userId,
        },
      });

      // 4. Persist staff assignments
      if (params.assignedStaff && params.assignedStaff.length > 0) {
        for (const staff of params.assignedStaff) {
          if (!staff.userId || !staff.role) continue;
          await tx.eventAssignment.create({
            data: {
              eventBookingId: booking.id,
              userId: staff.userId,
              role: staff.role.trim(),
              notes: staff.notes?.trim() || null,
            },
          });
        }
      }

      // 5. Initialize PostProductionJob, ClientSelection & Tasks
      const postProductionJob = await tx.postProductionJob.create({
        data: {
          tenantId,
          bookingId: booking.id,
          status: PostProductionStatus.PENDING,
          notes: `Post-production initialized for booking ${booking.bookingNumber} (${booking.title}).`,
        },
      });

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

      const defaultTasks = [
        { taskType: 'RAW_INGEST_AND_DUMP', notes: 'Dump all camera cards, checksum verify & generate proxies' },
        { taskType: 'COLOR_CORRECTION', notes: 'Master color grading and exposure balancing across all shots' },
        { taskType: 'HIGHLIGHT_TEASER', notes: '60-second teaser reel for social media & client preview' },
        { taskType: 'ALBUM_DESIGN', notes: 'Photo selection curation & storybook album layout design' },
        { taskType: 'CINEMATIC_FILM', notes: 'Full cinematic event film with audio mixing' },
      ];

      await tx.workflowTask.createMany({
        data: defaultTasks.map((t) => ({
          tenantId,
          jobId: postProductionJob.id,
          eventBookingId: booking.id,
          taskType: t.taskType,
          status: TaskStatus.PENDING,
          notes: t.notes,
        })),
      });

      // 6. Timeline entry
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: customer.id,
          action: 'BOOKING_CREATED_MANUAL',
          notes: `Manual booking ${booking.bookingNumber} ("${booking.title}") created for dates ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`,
          createdById: userId,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            jobId: postProductionJob.id,
          },
        },
      });

      // 7. Concurrency warning payload
      const concurrentWarning = await BookingService.checkConcurrentEvents({
        tenantId,
        startDate,
        endDate,
        excludeBookingId: booking.id,
      });

      return serializePrisma({
        booking,
        customer,
        postProductionJob,
        concurrentWarning,
      });
    });
  }

  /**
   * Updates an existing EventBooking (dates, title, location, notes, status, staff assignments).
   * Fully enforces tenant isolation and updates ActivityTimeline.
   */
  static async updateBooking(params: UpdateBookingParams) {
    const { tenantId, userId, branchId } = await this.resolveSession({
      tenantId: params.tenantId,
      branchId: params.branchId,
      userId: params.userId,
    });

    if (!params.id) {
      throw new Error('Booking ID is required');
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.eventBooking.findFirst({
        where: { id: params.id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new Error('Booking not found or unauthorized');
      }

      const startDate = params.startDate ? new Date(params.startDate) : existing.startDate;
      const endDate = params.endDate
        ? new Date(params.endDate)
        : params.startDate
        ? new Date(params.startDate)
        : existing.endDate;

      const updated = await tx.eventBooking.update({
        where: { id: existing.id },
        data: {
          ...(params.title !== undefined && { title: params.title.trim() }),
          ...(params.startDate !== undefined && { startDate }),
          ...(params.endDate !== undefined && { endDate }),
          ...(params.location !== undefined && { location: params.location?.trim() || null }),
          ...(params.notes !== undefined && { notes: params.notes?.trim() || null }),
          ...(params.status !== undefined && { status: params.status }),
          ...(params.journeyStatus !== undefined && { journeyStatus: params.journeyStatus }),
          ...(params.branchId !== undefined && { branchId: params.branchId }),
        },
      });

      // Update crew assignments if explicitly supplied
      if (params.assignedStaff !== undefined) {
        await tx.eventAssignment.deleteMany({
          where: { eventBookingId: existing.id },
        });

        for (const staff of params.assignedStaff) {
          if (!staff.userId || !staff.role) continue;
          await tx.eventAssignment.create({
            data: {
              eventBookingId: existing.id,
              userId: staff.userId,
              role: staff.role.trim(),
              notes: staff.notes?.trim() || null,
            },
          });
        }
      }

      // If status transitioned to CANCELLED, execute complete cascade release
      if (params.status === EventBookingStatus.CANCELLED && existing.status !== EventBookingStatus.CANCELLED) {
        await BookingService.executeCancellationCascade(tx, existing.id, tenantId, params.notes || undefined);
      }

      // Log ActivityTimeline
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: updated.customerId,
          action: 'BOOKING_UPDATED',
          notes: `Event booking ${updated.bookingNumber} details modified.`,
          createdById: userId,
          metadata: {
            bookingId: updated.id,
            bookingNumber: updated.bookingNumber,
            title: updated.title,
            status: updated.status,
            journeyStatus: updated.journeyStatus,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate.toISOString(),
          },
        },
      });

      // Concurrency check
      const concurrentWarning = await BookingService.checkConcurrentEvents({
        tenantId,
        startDate: updated.startDate,
        endDate: updated.endDate,
        excludeBookingId: updated.id,
      });

      return serializePrisma({
        booking: updated,
        concurrentWarning,
      });
    });
  }

  /**
   * Retrieves a single EventBooking with all associated relations.
   */
  static async getBookingById(id: string, tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const booking = await prisma.eventBooking.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                designation: true,
              },
            },
          },
        },
        subEvents: {
          include: {
            staffAssignments: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        postProductionJob: {
          include: {
            workflowTasks: {
              include: { user: true },
            },
            clientSelection: true,
          },
        },
        quotation: true,
        invoice: true,
      },
    });

    return booking ? serializePrisma(booking) : null;
  }

  /**
   * Executes the full cancellation cascade across interconnected modules:
   * - Releases ShootGearAllocation (status: RETURNED, returnNotes annotated) and marks Equipment AVAILABLE
   * - Marks crew assignments in EventAssignment & SubEvent StaffAssignment as cancelled/declined
   * - Transitions linked PostProductionJob to CANCELLED
   * - Transitions linked WorkflowTask rows to CANCELLED
   * - Locks ClientSelection boards and marks EXPIRED
   */
  public static async executeCancellationCascade(
    tx: Prisma.TransactionClient,
    bookingId: string,
    tenantId: string,
    reason?: string
  ) {
    const cancelNote = reason ? `Booking cancelled. Reason: ${reason}` : 'Booking cancelled.';

    // 1. Release all gear allocations & return equipment to AVAILABLE
    const gearAllocations = await tx.shootGearAllocation.findMany({
      where: {
        eventBookingId: bookingId,
        tenantId,
        status: { not: GearAllocationStatus.RETURNED },
      },
      select: { id: true, equipmentId: true },
    });

    if (gearAllocations.length > 0) {
      await tx.shootGearAllocation.updateMany({
        where: {
          id: { in: gearAllocations.map((g) => g.id) },
        },
        data: {
          status: GearAllocationStatus.RETURNED,
          returnedAt: new Date(),
          returnNotes: `Auto-released due to booking cancellation.${reason ? ` Reason: ${reason}` : ''}`,
        },
      });

      const equipIds = Array.from(new Set(gearAllocations.map((g) => g.equipmentId)));
      if (equipIds.length > 0) {
        await tx.equipment.updateMany({
          where: {
            id: { in: equipIds },
            status: AssetStatus.IN_USE,
          },
          data: {
            status: AssetStatus.AVAILABLE,
          },
        });
      }
    }

    // 2. Unassign / notify assigned crew in EventAssignment & SubEvent StaffAssignment
    await tx.eventAssignment.updateMany({
      where: { eventBookingId: bookingId },
      data: {
        notes: cancelNote,
      },
    });

    const subEvents = await tx.subEvent.findMany({
      where: { eventBookingId: bookingId, tenantId },
      select: { id: true },
    });
    const subEventIds = subEvents.map((s) => s.id);

    if (subEventIds.length > 0) {
      await tx.staffAssignment.updateMany({
        where: {
          subEventId: { in: subEventIds },
          tenantId,
        },
        data: {
          status: StaffAssignmentStatus.DECLINED,
          notes: cancelNote,
        },
      });
    }

    // 3. Transition linked PostProductionJob to CANCELLED
    const postProdJob = await tx.postProductionJob.findUnique({
      where: { bookingId },
      select: { id: true },
    });

    if (postProdJob) {
      await tx.postProductionJob.update({
        where: { id: postProdJob.id },
        data: {
          status: PostProductionStatus.CANCELLED,
          notes: `Post-production job cancelled due to event booking cancellation.${reason ? ` Reason: ${reason}` : ''}`,
        },
      });

      // 4. Transition linked WorkflowTasks to CANCELLED
      await tx.workflowTask.updateMany({
        where: {
          OR: [
            { jobId: postProdJob.id },
            { eventBookingId: bookingId },
          ],
          status: { not: TaskStatus.CANCELLED },
        },
        data: {
          status: TaskStatus.CANCELLED,
          notes: `Workflow task cancelled due to event booking cancellation.${reason ? ` Reason: ${reason}` : ''}`,
        },
      });
    } else {
      // Transition any direct workflow tasks linked to eventBookingId
      await tx.workflowTask.updateMany({
        where: {
          eventBookingId: bookingId,
          status: { not: TaskStatus.CANCELLED },
        },
        data: {
          status: TaskStatus.CANCELLED,
          notes: `Workflow task cancelled due to event booking cancellation.${reason ? ` Reason: ${reason}` : ''}`,
        },
      });
    }

    // 5. Expire & lock any ClientSelection boards linked to booking
    await tx.clientSelection.updateMany({
      where: {
        eventBookingId: bookingId,
        tenantId,
      },
      data: {
        status: SelectionStatus.EXPIRED,
        isSelectionLocked: true,
        operatorNotes: cancelNote,
      },
    });
  }

  /**
   * Cancels a booking, marks status as CANCELLED, cascades releases across modules, and logs timeline.
   */
  static async cancelBooking(id: string, reason?: string) {
    const { tenantId, userId } = await this.resolveSession();

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.eventBooking.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new Error('Booking not found or unauthorized');
      }

      const updated = await tx.eventBooking.update({
        where: { id },
        data: {
          status: EventBookingStatus.CANCELLED,
          notes: reason ? `${existing.notes || ''}\nCancellation reason: ${reason}`.trim() : existing.notes,
        },
      });

      // Execute full cancellation cascade
      await BookingService.executeCancellationCascade(tx, existing.id, tenantId, reason);

      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: updated.customerId,
          action: 'BOOKING_CANCELLED',
          notes: `Booking ${updated.bookingNumber} was cancelled. ${reason ? `Reason: ${reason}` : ''}`.trim(),
          createdById: userId,
          metadata: {
            bookingId: updated.id,
            bookingNumber: updated.bookingNumber,
            reason,
          },
        },
      });

      return serializePrisma(updated);
    });
  }
}
