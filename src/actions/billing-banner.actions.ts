'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface BillingBannerData {
  tenantId: string;
  tenantName: string;
  status: string;
  daysRemaining: number;
  isExpired: boolean;
  isUrgent: boolean;
  isTrial: boolean;
  planName: string | null;
  expiryDateFormatted: string;
}

/**
 * Super-fast, RBAC-guarded action to retrieve billing and expiry announcement banner data.
 * Strictly restricted to TENANT_OWNER roles. Returns null immediately for all other roles or
 * when no imminent expiration is detected within 15 days.
 */
export async function getBillingBannerDataAction(): Promise<BillingBannerData | null> {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    const tenantId = (session?.user as { tenantId?: string })?.tenantId;

    // 1. Strict RBAC Gate: Only TENANT_OWNER can access or view studio billing alerts
    if (!session?.user || userRole !== 'TENANT_OWNER' || !tenantId) {
      return null;
    }

    // 2. Query Tenant & Subscription details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscription: {
          select: {
            billingCycle: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    // Lifetime subscribers never require expiry warning banners
    if (tenant.subscription?.billingCycle === 'LIFETIME') {
      return null;
    }

    const now = new Date();
    const status = tenant.subscriptionStatus;

    // Handle Past Due or Cancelled statuses immediately as urgent/expired
    if (status === 'PAST_DUE' || status === 'CANCELLED' || status === 'CANCELED') {
      return {
        tenantId: tenant.id,
        tenantName: tenant.tradeName || tenant.name,
        status,
        daysRemaining: 0,
        isExpired: true,
        isUrgent: true,
        isTrial: false,
        planName: tenant.subscription?.plan?.name || null,
        expiryDateFormatted: 'Immediate',
      };
    }

    // Determine target expiration date
    let targetExpiryDate: Date | null = null;
    let isTrial = false;

    if (tenant.subscription?.endDate) {
      targetExpiryDate = new Date(tenant.subscription.endDate);
      isTrial = false;
    } else if (tenant.trialEndsAt) {
      targetExpiryDate = new Date(tenant.trialEndsAt);
      isTrial = status === 'TRIAL';
    }

    if (!targetExpiryDate) {
      return null;
    }

    const diffMs = targetExpiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Expiry Threshold: Only alert if expires within next 15 days (or already expired)
    if (daysRemaining > 15) {
      return null;
    }

    const isExpired = daysRemaining <= 0;
    const isUrgent = daysRemaining <= 3;

    const formattedDate = targetExpiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.tradeName || tenant.name,
      status,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired,
      isUrgent,
      isTrial,
      planName: tenant.subscription?.plan?.name || null,
      expiryDateFormatted: formattedDate,
    };
  } catch (error) {
    console.error('[getBillingBannerDataAction] Error:', error);
    return null;
  }
}
