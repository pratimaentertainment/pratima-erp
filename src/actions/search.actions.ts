'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getActiveContext } from '@/lib/context';
import { formatDate } from '@/lib/date';
import { serializePrisma } from '@/lib/serialize';

export interface SearchResultItem {
  id: string;
  type: 'CUSTOMER' | 'LEAD' | 'BOOKING';
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
}

export interface GlobalSearchResponse {
  customers: SearchResultItem[];
  leads: SearchResultItem[];
  bookings: SearchResultItem[];
  totalCount: number;
}

export async function globalSearchAction(query: string): Promise<{
  success: boolean;
  data?: GlobalSearchResponse;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 1) {
      return {
        success: true,
        data: { customers: [], leads: [], bookings: [], totalCount: 0 },
      };
    }

    const context = await getActiveContext();
    if (!context?.tenantId) {
      return { success: false, error: 'No active tenant context found' };
    }

    const { tenantId, branchId, isOwnerOrAdmin } = context;

    // Build branch filter based on user RBAC
    const branchFilter = !isOwnerOrAdmin && branchId ? { branchId } : {};

    const [rawCustomers, rawLeads, rawBookings] = await Promise.all([
      // 1. Search Customers
      prisma.customer.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...branchFilter,
          OR: [
            { firstName: { contains: trimmed, mode: 'insensitive' } },
            { lastName: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed, mode: 'insensitive' } },
            { whatsapp: { contains: trimmed, mode: 'insensitive' } },
            { email: { contains: trimmed, mode: 'insensitive' } },
            { customerCode: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          customerCode: true,
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Search Leads
      prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...branchFilter,
          OR: [
            { leadCode: { contains: trimmed, mode: 'insensitive' } },
            {
              customer: {
                OR: [
                  { firstName: { contains: trimmed, mode: 'insensitive' } },
                  { lastName: { contains: trimmed, mode: 'insensitive' } },
                  { phone: { contains: trimmed, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          leadCode: true,
          status: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Search Event Bookings
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...branchFilter,
          OR: [
            { bookingNumber: { contains: trimmed, mode: 'insensitive' } },
            { title: { contains: trimmed, mode: 'insensitive' } },
            { location: { contains: trimmed, mode: 'insensitive' } },
            {
              customer: {
                OR: [
                  { firstName: { contains: trimmed, mode: 'insensitive' } },
                  { lastName: { contains: trimmed, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          bookingNumber: true,
          title: true,
          location: true,
          status: true,
          startDate: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: 6,
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const customers: SearchResultItem[] = rawCustomers.map((c) => ({
      id: c.id,
      type: 'CUSTOMER',
      title: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: [c.customerCode, c.phone, c.email].filter(Boolean).join(' • '),
      url: `/customers/${c.id}`,
      badge: 'Client',
    }));

    const leads: SearchResultItem[] = rawLeads.map((l) => ({
      id: l.id,
      type: 'LEAD',
      title: `Lead #${l.leadCode}`,
      subtitle: `${l.customer.firstName} ${l.customer.lastName} • ${l.status}`,
      url: `/leads/${l.id}`,
      badge: l.status,
    }));

    const bookings: SearchResultItem[] = rawBookings.map((b) => ({
      id: b.id,
      type: 'BOOKING',
      title: b.title || `Booking #${b.bookingNumber}`,
      subtitle: `${formatDate(b.startDate, 'dd MMM yyyy')} • ${b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : ''} ${b.location ? `• ${b.location}` : ''}`,
      url: `/operations/dispatch`,
      badge: b.status,
    }));

    const totalCount = customers.length + leads.length + bookings.length;

    const payload: GlobalSearchResponse = {
      customers,
      leads,
      bookings,
      totalCount,
    };

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payload)),
    };
  } catch (error: any) {
    console.error('Error executing global search:', error);
    return { success: false, error: error?.message || 'Search failed' };
  }
}
