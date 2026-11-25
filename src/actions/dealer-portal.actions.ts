'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface DealerPortalReferredTenant {
  id: string;
  name: string;
  city: string;
  status: string;
  joinedAt: string;
}

export interface DealerPortalCommission {
  id: string;
  date: string;
  studioName: string;
  paymentCycleNumber: number;
  grossAmount: number;
  discountApplied: number;
  netPaidAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
}

export interface DealerPortalPayout {
  id: string;
  paidAt: string;
  amount: number;
  paymentMode: string;
  transactionRef: string;
  notes: string | null;
}

export interface DealerPortalData {
  dealer: {
    id: string;
    dealerCode: string;
    businessName: string;
    contactPerson: string;
    phone: string;
    city: string | null;
    commissionPercent: number;
    firstPaymentDiscountPercent: number;
    bankDetails: string | null;
    isActive: boolean;
  };
  metrics: {
    totalReferredStudios: number;
    activePayingStudios: number;
    lifetimeCommission: number;
    pendingPayout: number;
    totalPaidOut: number;
  };
  referralLink: string;
  referredStudios: DealerPortalReferredTenant[];
  commissions: DealerPortalCommission[];
  payouts: DealerPortalPayout[];
}

/**
 * Fetches secure, scoped data for the authenticated Dealer Partner portal.
 * Ensures zero leakage of tenant private data (invoices, client details, passwords, etc.).
 */
export async function getDealerPortalDataAction(): Promise<{
  success: boolean;
  data?: DealerPortalData;
  error?: string;
}> {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !user || !user.id) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const isDealer = user.role === 'DEALER';
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isDealer && !isSuperAdmin) {
      return { success: false, error: 'Forbidden: Dealer access required.' };
    }

    let dealer = await prisma.dealerProfile.findUnique({
      where: { userId: user.id },
      include: {
        referredTenants: {
          select: {
            id: true,
            name: true,
            city: true,
            subscriptionStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        commissions: {
          include: {
            tenant: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payouts: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    // If Super Admin previewing, load the first active dealer or sample
    if (!dealer && isSuperAdmin) {
      dealer = await prisma.dealerProfile.findFirst({
        include: {
          referredTenants: {
            select: {
              id: true,
              name: true,
              city: true,
              subscriptionStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          commissions: {
            include: {
              tenant: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          payouts: {
            orderBy: { paidAt: 'desc' },
          },
        },
      });
    }

    if (!dealer) {
      return {
        success: false,
        error: 'Dealer profile not found. Please contact platform support.',
      };
    }

    let lifetimeCommission = 0;
    let pendingPayout = 0;
    for (const c of dealer.commissions) {
      const amt = Number(c.commissionAmount);
      lifetimeCommission += amt;
      if (c.status === 'PENDING') {
        pendingPayout += amt;
      }
    }

    let totalPaidOut = 0;
    for (const p of dealer.payouts) {
      totalPaidOut += Number(p.amount);
    }

    const activePayingStudios = dealer.referredTenants.filter(
      (t) => t.subscriptionStatus === 'ACTIVE'
    ).length;

    const appUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://pratima-erp.vercel.app';
    const cleanAppUrl = appUrl.replace(/\/$/, '');
    const referralLink = `${cleanAppUrl}/signup?ref=${dealer.dealerCode}`;

    return {
      success: true,
      data: {
        dealer: {
          id: dealer.id,
          dealerCode: dealer.dealerCode,
          businessName: dealer.businessName,
          contactPerson: dealer.contactPerson,
          phone: dealer.phone,
          city: dealer.city,
          commissionPercent: Number(dealer.commissionPercent),
          firstPaymentDiscountPercent: Number(dealer.firstPaymentDiscountPercent),
          bankDetails: dealer.bankDetails,
          isActive: dealer.isActive,
        },
        metrics: {
          totalReferredStudios: dealer.referredTenants.length,
          activePayingStudios,
          lifetimeCommission,
          pendingPayout,
          totalPaidOut,
        },
        referralLink,
        referredStudios: dealer.referredTenants.map((t) => ({
          id: t.id,
          name: t.name,
          city: t.city || 'N/A',
          status: t.subscriptionStatus,
          joinedAt: t.createdAt.toISOString(),
        })),
        commissions: dealer.commissions.map((c) => ({
          id: c.id,
          date: c.createdAt.toISOString(),
          studioName: c.tenant.name,
          paymentCycleNumber: c.paymentCycleNumber,
          grossAmount: Number(c.grossPlanAmount),
          discountApplied: Number(c.discountApplied),
          netPaidAmount: Number(c.netPaidAmount),
          commissionPercent: Number(c.commissionPercent),
          commissionAmount: Number(c.commissionAmount),
          status: c.status,
        })),
        payouts: dealer.payouts.map((p) => ({
          id: p.id,
          paidAt: p.paidAt.toISOString(),
          amount: Number(p.amount),
          paymentMode: p.paymentMode,
          transactionRef: p.transactionRef,
          notes: p.notes,
        })),
      },
    };
  } catch (error: any) {
    console.error('[getDealerPortalDataAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch dealer portal data.',
    };
  }
}
