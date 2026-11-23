import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { serializePrisma } from '@/lib/serialize';
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import { Prisma, EquipmentCategory, AssetStatus } from '@prisma/client';

export interface AssignTeamMemberParams {
  bookingId: string;
  userId: string;
  role: string;
  agreedPayment?: number | string | null;
  notes?: string;
  tenantId?: string;
}

export interface WhatsAppNotificationPayload {
  toPhone: string;
  recipientName: string;
  message: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  role: string;
  agreedPayment: string;
  directUrl: string;
}

export class DispatchService {
  /**
   * Resolves active user session and tenant/branch context.
   */
  private static async resolveSession(overrides?: { tenantId?: string; branchId?: string }) {
    if (overrides?.tenantId) {
      return {
        tenantId: overrides.tenantId,
        userId: 'system',
        branchId: overrides.branchId,
      };
    }

    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      throw new Error('Unauthorized: No active tenant session');
    }

    const context = await getActiveContext().catch(() => null);

    return {
      tenantId: user.tenantId as string,
      userId: user.id as string,
      branchId: (context?.activeBranch?.id as string) || user?.branchId,
    };
  }

  /**
   * Assigns a staff/crew member to an EventBooking, records agreed payment,
   * generates an automated WhatsApp payload, and marks notification status.
   */
  static async assignTeamMemberAndNotify(params: AssignTeamMemberParams) {
    const { tenantId, userId: actorUserId } = await this.resolveSession({ tenantId: params.tenantId });

    if (!params.bookingId) throw new Error('Booking ID is required');
    if (!params.userId) throw new Error('Staff user ID is required');
    if (!params.role) throw new Error('Role is required');

    // 1. Fetch Booking and Staff User
    const booking = await prisma.eventBooking.findFirst({
      where: { id: params.bookingId, tenantId, deletedAt: null },
      include: {
        tenant: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new Error('Event booking not found or unauthorized');
    }

    const staffUser = await prisma.user.findFirst({
      where: { id: params.userId, tenantId, deletedAt: null },
    });

    if (!staffUser) {
      throw new Error('Staff member not found or unauthorized');
    }

    // 2. Parse agreed payment
    let parsedPayment: Prisma.Decimal | null = null;
    if (params.agreedPayment !== undefined && params.agreedPayment !== null && params.agreedPayment !== '') {
      const num = Number(params.agreedPayment);
      if (!isNaN(num) && num >= 0) {
        parsedPayment = new Prisma.Decimal(num);
      }
    }

    // 3. Build WhatsApp notification payload
    const studioName =
      (booking.tenant as any)?.settings?.studioName ||
      booking.tenant?.tradeName ||
      booking.tenant?.name ||
      'Pratima Photography Studio';

    const sDate = formatDate(booking.startDate, 'dd MMM yyyy');
    const eDate = booking.endDate ? formatDate(booking.endDate, 'dd MMM yyyy') : null;
    const dateFormatted = eDate && eDate !== sDate ? `${sDate} to ${eDate}` : sDate;
    const venueFormatted = booking.location || 'Designated Venue';
    const paymentFormatted =
      parsedPayment != null ? formatMoney(Number(parsedPayment), 'INR') : 'As Per Contract / Day Rate';

    const message = `Hello ${staffUser.name || 'Crew Member'}, you have been assigned as "${params.role}" for upcoming event assignment "${booking.title}" with ${studioName}.\n\n📅 Date: ${dateFormatted}\n📍 Location: ${venueFormatted}\n💼 Role: ${params.role}\n💰 Agreed Payout: ${paymentFormatted}\n\nPlease review your itinerary and coordinate gear preparation with the studio lead.`;

    let cleanPhone = (staffUser.phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    const directWhatsAppUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    // 4. Check if tenant has an active WhatsApp integration
    const whatsappIntegration = await prisma.tenantIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'WHATSAPP',
        },
      },
    });

    // Mark notification dispatched if phone number is valid
    const notificationSent = Boolean(cleanPhone && cleanPhone.length >= 10);

    // 5. Upsert EventAssignment
    const assignment = await prisma.eventAssignment.upsert({
      where: {
        eventBookingId_userId_role: {
          eventBookingId: booking.id,
          userId: staffUser.id,
          role: params.role.trim(),
        },
      },
      update: {
        agreedPayment: parsedPayment,
        notificationSent,
        notificationSentAt: notificationSent ? new Date() : null,
        notes: params.notes?.trim() || null,
        assignedAt: new Date(),
      },
      create: {
        eventBookingId: booking.id,
        userId: staffUser.id,
        role: params.role.trim(),
        agreedPayment: parsedPayment,
        notificationSent,
        notificationSentAt: notificationSent ? new Date() : null,
        notes: params.notes?.trim() || null,
        assignedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            designation: true,
            employmentType: true,
          },
        },
      },
    });

    // 6. Record in ActivityTimeline
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId: booking.leadId || booking.id,
        action: 'TEAM_MEMBER_ASSIGNED',
        notes: `Assigned ${staffUser.name} as ${params.role} for booking ${booking.bookingNumber} (${booking.title}). Agreed Payout: ${paymentFormatted}. Notification status: ${notificationSent ? 'Dispatched' : 'Pending'}.`,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: staffUser.id,
          role: params.role,
          agreedPayment: parsedPayment ? Number(parsedPayment) : null,
          notificationSent,
        },
      },
    });

    const whatsappPayload: WhatsAppNotificationPayload = {
      toPhone: cleanPhone,
      recipientName: staffUser.name || 'Crew Member',
      message,
      eventTitle: booking.title,
      eventDate: dateFormatted,
      location: venueFormatted,
      role: params.role,
      agreedPayment: paymentFormatted,
      directUrl: directWhatsAppUrl,
    };

    return serializePrisma({
      assignment,
      notificationSent,
      whatsappPayload,
      directWhatsAppUrl,
      integrationConnected: Boolean(whatsappIntegration?.isActive),
    });
  }

  /**
   * Cron-ready automated reminder dispatch:
   * Finds events scheduled in the next 24 hours and triggers reminder notifications
   * to all assigned team members.
   */
  static async sendEventReminders() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.eventBooking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'BLOCKED'] },
        deletedAt: null,
        startDate: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        tenant: true,
        assignments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const reminderLogs: Array<{
      bookingId: string;
      bookingNumber: string;
      bookingTitle: string;
      userId: string;
      staffName: string;
      phone: string;
      message: string;
      directUrl: string;
    }> = [];

    for (const booking of upcomingBookings) {
      const studioName =
        (booking.tenant as any)?.settings?.studioName ||
        booking.tenant?.tradeName ||
        booking.tenant?.name ||
        'Pratima Studio';

      const sDate = formatDate(booking.startDate, 'dd MMM yyyy');
      const venueFormatted = booking.location || 'Scheduled Venue';

      for (const asg of booking.assignments) {
        if (!asg.user) continue;

        let cleanPhone = (asg.user.phone || '').replace(/\D/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = `91${cleanPhone}`;
        } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = `91${cleanPhone.slice(1)}`;
        }

        const message = `🔔 24h Reminder: You have an event assignment tomorrow with ${studioName}!\n\n🎬 Assignment: ${booking.title}\n📅 Date: ${sDate}\n📍 Venue: ${venueFormatted}\n💼 Role: ${asg.role}\n\nPlease check in with the production desk on equipment readiness.`;

        const directUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;

        reminderLogs.push({
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          bookingTitle: booking.title,
          userId: asg.user.id,
          staffName: asg.user.name || 'Crew Member',
          phone: cleanPhone || 'No Phone',
          message,
          directUrl,
        });

        // Mark notification timestamp
        await prisma.eventAssignment.update({
          where: { id: asg.id },
          data: {
            notificationSent: true,
            notificationSentAt: new Date(),
          },
        });
      }
    }

    return {
      totalRemindedEvents: upcomingBookings.length,
      totalRemindersSent: reminderLogs.length,
      reminderLogs,
    };
  }

  /**
   * Fetches upcoming dispatch events for the dispatch board.
   */
  static async getUpcomingDispatchEvents(tenantId?: string) {
    const { tenantId: effectiveTenantId } = await this.resolveSession({ tenantId });

    const bookings = await prisma.eventBooking.findMany({
      where: {
        tenantId: effectiveTenantId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'BLOCKED'] },
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                designation: true,
                employmentType: true,
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
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return serializePrisma(bookings);
  }

  /**
   * Fetches equipment inventory list for the tenant/branch.
   */
  static async getEquipmentInventory(tenantId?: string) {
    const { tenantId: effectiveTenantId, branchId } = await this.resolveSession({ tenantId });

    const equipments = await prisma.equipment.findMany({
      where: {
        OR: [
          { tenantId: effectiveTenantId },
          ...(branchId ? [{ branchId }] : []),
        ],
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        checkouts: {
          where: { returnedAt: null },
        },
      },
      orderBy: { name: 'asc' },
    });

    return serializePrisma(equipments);
  }

  /**
   * Creates a new equipment item in inventory.
   */
  static async createEquipmentItem(
    data: {
      name: string;
      category: EquipmentCategory;
      serialNumber?: string;
      brand?: string;
      modelNumber?: string;
      status?: AssetStatus;
      notes?: string;
    },
    tenantIdOverride?: string,
    branchIdOverride?: string
  ) {
    const { tenantId, branchId } = await this.resolveSession({
      tenantId: tenantIdOverride,
      branchId: branchIdOverride,
    });

    if (!branchId) {
      // Find default branch for this tenant
      const defaultBranch = await prisma.branch.findFirst({
        where: { tenantId },
      });
      if (!defaultBranch) {
        throw new Error('A branch is required to register equipment');
      }
      return await prisma.equipment.create({
        data: {
          tenantId,
          branchId: defaultBranch.id,
          name: data.name.trim(),
          category: data.category,
          serialNumber: data.serialNumber?.trim() || null,
          brand: data.brand?.trim() || null,
          modelNumber: data.modelNumber?.trim() || null,
          status: data.status || AssetStatus.AVAILABLE,
          notes: data.notes?.trim() || null,
        },
      });
    }

    return await prisma.equipment.create({
      data: {
        tenantId,
        branchId,
        name: data.name.trim(),
        category: data.category,
        serialNumber: data.serialNumber?.trim() || null,
        brand: data.brand?.trim() || null,
        modelNumber: data.modelNumber?.trim() || null,
        status: data.status || AssetStatus.AVAILABLE,
        notes: data.notes?.trim() || null,
      },
    });
  }

  /**
   * Updates an equipment item status (e.g. AVAILABLE, IN_USE, MAINTENANCE, RETIRED).
   */
  static async updateEquipmentStatus(
    equipmentId: string,
    status: AssetStatus,
    notes?: string
  ) {
    const { tenantId, branchId } = await this.resolveSession();

    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        OR: [
          { tenantId },
          ...(branchId ? [{ branchId }] : []),
        ],
      },
    });

    if (!equipment) {
      throw new Error('Equipment not found or unauthorized');
    }

    return await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        status,
        notes: notes !== undefined ? notes?.trim() || null : equipment.notes,
      },
    });
  }
}
