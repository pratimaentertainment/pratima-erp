import { prisma } from '@/lib/prisma';
import { ServiceContext } from '@/lib/application/utils/context';
import {
  CalendarEventDto,
  CalendarCrewMember,
  CalendarWorkflowTask,
  GetCalendarEventsOptions,
} from './calendar.types';

export class CalendarService {
  /**
   * Get all calendar events for the tenant/branch from SubEvents and standalone EventBookings.
   * Guarantees strict multi-tenant isolation.
   */
  static async getCalendarEvents(
    ctx: ServiceContext,
    options: GetCalendarEventsOptions = {}
  ): Promise<CalendarEventDto[]> {
    const events: CalendarEventDto[] = [];
    const bookingId = options.eventBookingId || options.projectId;

    // 1. Fetch SubEvents scoped strictly by tenant (and branch if provided)
    const subEvents = await prisma.subEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        ...(options.startDate || options.endDate
          ? {
              eventDate: {
                ...(options.startDate ? { gte: options.startDate } : {}),
                ...(options.endDate ? { lte: options.endDate } : {}),
              },
            }
          : {}),
        ...(bookingId ? { eventBookingId: bookingId } : {}),
        ...(ctx.branchId ? { eventBooking: { branchId: ctx.branchId } } : {}),
      },
      include: {
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            status: true,
            journeyStatus: true,
            location: true,
            notes: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            workflowTasks: {
              select: {
                id: true,
                type: true,
                status: true,
                dueDate: true,
                user: { select: { name: true } },
                vendor: { select: { name: true } },
              },
            },
            assignments: {
              select: {
                id: true,
                role: true,
                user: {
                  select: { id: true, name: true, profileImage: true, email: true },
                },
              },
            },
          },
        },
        staffAssignments: {
          include: {
            user: {
              select: { id: true, name: true, profileImage: true, email: true },
            },
          },
        },
      },
      take: 1000,
      orderBy: { eventDate: 'asc' },
    });

    for (const sub of subEvents) {
      // Collect crew from sub-event staff assignments; if none, fall back to booking assignments
      const crewMap = new Map<string, CalendarCrewMember>();

      for (const sa of sub.staffAssignments) {
        if (sa.user) {
          crewMap.set(sa.user.id, {
            id: sa.user.id,
            name: sa.user.name,
            role: sa.role,
            profileImage: sa.user.profileImage,
            email: sa.user.email,
          });
        }
      }

      if (crewMap.size === 0 && sub.eventBooking?.assignments) {
        for (const ea of sub.eventBooking.assignments) {
          if (ea.user) {
            crewMap.set(ea.user.id, {
              id: ea.user.id,
              name: ea.user.name,
              role: ea.role,
              profileImage: ea.user.profileImage,
              email: ea.user.email,
            });
          }
        }
      }

      const tasks: CalendarWorkflowTask[] = (sub.eventBooking?.workflowTasks || []).map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        dueDate: t.dueDate,
        assignedToName: t.user?.name || t.vendor?.name || null,
      }));

      const customer = sub.eventBooking?.customer
        ? {
            id: sub.eventBooking.customer.id,
            name: `${sub.eventBooking.customer.firstName} ${sub.eventBooking.customer.lastName || ''}`.trim(),
            phone: sub.eventBooking.customer.phone,
            email: sub.eventBooking.customer.email,
          }
        : null;

      events.push({
        id: sub.id,
        type: 'SUB_EVENT',
        title: `${sub.name} — ${sub.eventBooking.title}`,
        subEventName: sub.name,
        bookingTitle: sub.eventBooking.title,
        bookingNumber: sub.eventBooking.bookingNumber,
        start: sub.eventDate,
        end: sub.eventDate,
        startTimeString: sub.startTime,
        endTimeString: sub.endTime,
        location: sub.locationVenue || sub.eventBooking.location || null,
        venue: sub.locationVenue || null,
        notes: sub.notes || sub.eventBooking.notes || null,
        status: sub.eventBooking.status,
        journeyStatus: sub.eventBooking.journeyStatus,
        bookingId: sub.eventBookingId,
        projectId: sub.eventBookingId,
        customer,
        assignedCrew: Array.from(crewMap.values()),
        workflowTasks: tasks,
      });
    }

    // 2. Also surface standalone EventBookings that have no subEvents created yet
    const standaloneBookings = await prisma.eventBooking.findMany({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        subEvents: { none: {} },
        ...(options.startDate || options.endDate
          ? {
              startDate: {
                ...(options.startDate ? { gte: options.startDate } : {}),
                ...(options.endDate ? { lte: options.endDate } : {}),
              },
            }
          : {}),
        ...(bookingId ? { id: bookingId } : {}),
        ...(ctx.branchId ? { branchId: ctx.branchId } : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        workflowTasks: {
          select: {
            id: true,
            type: true,
            status: true,
            dueDate: true,
            user: { select: { name: true } },
            vendor: { select: { name: true } },
          },
        },
        assignments: {
          select: {
            id: true,
            role: true,
            user: {
              select: { id: true, name: true, profileImage: true, email: true },
            },
          },
        },
      },
      take: 200,
    });

    for (const b of standaloneBookings) {
      const crew: CalendarCrewMember[] = (b.assignments || [])
        .filter((a) => !!a.user)
        .map((a) => ({
          id: a.user!.id,
          name: a.user!.name,
          role: a.role,
          profileImage: a.user!.profileImage,
          email: a.user!.email,
        }));

      const tasks: CalendarWorkflowTask[] = (b.workflowTasks || []).map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        dueDate: t.dueDate,
        assignedToName: t.user?.name || t.vendor?.name || null,
      }));

      const customer = b.customer
        ? {
            id: b.customer.id,
            name: `${b.customer.firstName} ${b.customer.lastName || ''}`.trim(),
            phone: b.customer.phone,
            email: b.customer.email,
          }
        : null;

      events.push({
        id: b.id,
        type: 'EVENT_BOOKING',
        title: `[Booking] ${b.title}`,
        subEventName: 'Entire Event',
        bookingTitle: b.title,
        bookingNumber: b.bookingNumber,
        start: b.startDate,
        end: b.endDate,
        location: b.location || null,
        venue: b.location || null,
        notes: b.notes || null,
        status: b.status,
        journeyStatus: b.journeyStatus,
        bookingId: b.id,
        projectId: b.id,
        customer,
        assignedCrew: crew,
        workflowTasks: tasks,
      });
    }

    return events;
  }
}
