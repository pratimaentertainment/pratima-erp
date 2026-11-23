'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResponse } from './action-response';

export interface MarketingGuestLeadItem {
  id: string;
  tenantId: string;
  bookingId: string | null;
  guestName: string;
  whatsappNumber: string;
  selfieImageUrl: string;
  isMatched: boolean;
  matchedPhotosCount: number;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    title: string;
    bookingNumber: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
}

export interface MarketingHubStats {
  totalLeads: number;
  matchedLeads: number;
  pendingMatch: number;
  uniqueEvents: number;
  totalPhotosDelivered: number;
}

/**
 * Server action to fetch all captured guest leads for a studio tenant.
 * Uses lean projection and strictly verifies multi-tenant authorization boundaries.
 */
export async function getGuestLeadsAction(
  tenantId?: string
): Promise<ActionResponse<MarketingGuestLeadItem[]>> {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const resolvedTenantId = tenantId || user.tenantId;

    if (!resolvedTenantId) {
      return { success: false, error: 'Tenant identifier is missing' };
    }

    // Strict multi-tenant security verification
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== resolvedTenantId) {
      return { success: false, error: 'Access denied: Cross-tenant query forbidden' };
    }

    const leads = await prisma.guestLead.findMany({
      where: {
        tenantId: resolvedTenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        bookingId: true,
        guestName: true,
        whatsappNumber: true,
        selfieImageUrl: true,
        isMatched: true,
        matchedPhotosCount: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedLeads: MarketingGuestLeadItem[] = leads.map((lead) => ({
      id: lead.id,
      tenantId: lead.tenantId,
      bookingId: lead.bookingId,
      guestName: lead.guestName,
      whatsappNumber: lead.whatsappNumber,
      selfieImageUrl: lead.selfieImageUrl,
      isMatched: lead.isMatched,
      matchedPhotosCount: lead.matchedPhotosCount,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      booking: lead.booking
        ? {
            id: lead.booking.id,
            title: lead.booking.title,
            bookingNumber: lead.booking.bookingNumber,
            startDate: lead.booking.startDate.toISOString(),
            endDate: lead.booking.endDate.toISOString(),
            status: lead.booking.status,
          }
        : null,
    }));

    return {
      success: true,
      data: formattedLeads,
    };
  } catch (error: any) {
    console.error('Error fetching marketing guest leads:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch guest leads',
    };
  }
}

/**
 * Server action to fetch aggregated CRM metrics for the Marketing & Guest Leads Hub.
 */
export async function getMarketingHubStatsAction(
  tenantId?: string
): Promise<ActionResponse<MarketingHubStats>> {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const resolvedTenantId = tenantId || user.tenantId;

    if (!resolvedTenantId) {
      return { success: false, error: 'Tenant identifier is missing' };
    }

    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== resolvedTenantId) {
      return { success: false, error: 'Access denied: Cross-tenant query forbidden' };
    }

    const [totalLeads, matchedLeads, aggregateCount, uniqueEventsGroup] = await Promise.all([
      prisma.guestLead.count({
        where: { tenantId: resolvedTenantId, deletedAt: null },
      }),
      prisma.guestLead.count({
        where: { tenantId: resolvedTenantId, isMatched: true, deletedAt: null },
      }),
      prisma.guestLead.aggregate({
        where: { tenantId: resolvedTenantId, deletedAt: null },
        _sum: { matchedPhotosCount: true },
      }),
      prisma.guestLead.groupBy({
        by: ['bookingId'],
        where: {
          tenantId: resolvedTenantId,
          bookingId: { not: null },
          deletedAt: null,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalLeads,
        matchedLeads,
        pendingMatch: Math.max(0, totalLeads - matchedLeads),
        uniqueEvents: uniqueEventsGroup.length,
        totalPhotosDelivered: aggregateCount._sum.matchedPhotosCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching marketing hub stats:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch marketing stats',
    };
  }
}
