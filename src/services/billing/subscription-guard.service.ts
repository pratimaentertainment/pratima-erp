import { prisma } from '@/lib/prisma';
import { cache } from 'react';

export type SubscriptionLockReason = 'TRIAL_EXPIRED' | 'SUBSCRIPTION_EXPIRED' | 'NONE';

export interface TenantLockStatus {
  isLocked: boolean;
  reason: SubscriptionLockReason;
  daysLeft: number;
  subscriptionStatus?: string;
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
  planName?: string | null;
}

/**
 * Evaluates whether a tenant's workspace access is hard-locked due to trial
 * expiration, unpaid past-due invoice, or expired active subscription.
 *
 * Rules:
 * 1. Lifetime subscriptions are never locked.
 * 2. TRIAL status is locked IF trialEndsAt < current time.
 * 3. ACTIVE status is locked IF subscriptionEndsAt (endDate) < current time.
 * 4. PAST_DUE, CANCELLED, or CANCELED statuses are immediately locked.
 * 
 * @param tenantId UUID of the tenant studio
 * @returns TenantLockStatus containing lock flag, canonical reason, and days remaining.
 */
export const checkTenantLockStatus = cache(async function checkTenantLockStatus(tenantId: string): Promise<TenantLockStatus> {
  if (!tenantId) {
    return {
      isLocked: true,
      reason: 'SUBSCRIPTION_EXPIRED',
      daysLeft: 0,
    };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        parentTenantId: true,
        isFranchisor: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscription: {
          select: {
            id: true,
            billingCycle: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return {
        isLocked: true,
        reason: 'SUBSCRIPTION_EXPIRED',
        daysLeft: 0,
      };
    }

    // Franchisee Subscription Inheritance:
    // If tenant is a franchisee (parentTenantId != null), evaluate the Parent Franchisor's lock status!
    if (tenant.parentTenantId) {
      const parentLock = await checkTenantLockStatus(tenant.parentTenantId);
      return {
        ...parentLock,
        planName: parentLock.planName ? `${parentLock.planName} (Franchise Network)` : 'Franchise Network',
      };
    }

    // 1. Lifetime subscribers are exempt from any lock
    if (tenant.subscription?.billingCycle === 'LIFETIME') {
      return {
        isLocked: false,
        reason: 'NONE',
        daysLeft: 99999,
        subscriptionStatus: tenant.subscriptionStatus,
        planName: tenant.subscription?.plan?.name || null,
      };
    }

    const now = new Date();
    const status = tenant.subscriptionStatus;
    const planName = tenant.subscription?.plan?.name || null;

    // 2. TRIAL Status Evaluation
    if (status === 'TRIAL') {
      if (!tenant.trialEndsAt) {
        return {
          isLocked: true,
          reason: 'TRIAL_EXPIRED',
          daysLeft: 0,
          subscriptionStatus: status,
          planName,
        };
      }

      const trialEnds = new Date(tenant.trialEndsAt);
      if (trialEnds < now) {
        return {
          isLocked: true,
          reason: 'TRIAL_EXPIRED',
          daysLeft: 0,
          subscriptionStatus: status,
          trialEndsAt: trialEnds,
          planName,
        };
      }

      const diffMs = trialEnds.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        isLocked: false,
        reason: 'NONE',
        daysLeft,
        subscriptionStatus: status,
        trialEndsAt: trialEnds,
        planName,
      };
    }

    // 3. ACTIVE Status Evaluation
    if (status === 'ACTIVE') {
      const subscriptionEndsAt = tenant.subscription?.endDate;

      if (subscriptionEndsAt) {
        const subEnds = new Date(subscriptionEndsAt);
        if (subEnds < now) {
          return {
            isLocked: true,
            reason: 'SUBSCRIPTION_EXPIRED',
            daysLeft: 0,
            subscriptionStatus: status,
            subscriptionEndsAt: subEnds,
            planName,
          };
        }

        const diffMs = subEnds.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        return {
          isLocked: false,
          reason: 'NONE',
          daysLeft,
          subscriptionStatus: status,
          subscriptionEndsAt: subEnds,
          planName,
        };
      }

      // Active with no end date (e.g. continuous recurring billing)
      return {
        isLocked: false,
        reason: 'NONE',
        daysLeft: 99999,
        subscriptionStatus: status,
        planName,
      };
    }

    // 4. Past Due, Cancelled, or unknown unpayable status -> Locked
    return {
      isLocked: true,
      reason: 'SUBSCRIPTION_EXPIRED',
      daysLeft: 0,
      subscriptionStatus: status,
      planName,
    };
  } catch (error) {
    console.error('[SubscriptionGuardService Error] checkTenantLockStatus failed:', error);
    // In case of an unexpected database failure, default to locked to prevent unauthorized access
    return {
      isLocked: true,
      reason: 'SUBSCRIPTION_EXPIRED',
      daysLeft: 0,
    };
  }
});

/**
 * Singleton / namespace class representation for enterprise injection.
 */
export class SubscriptionGuardService {
  public static checkTenantLockStatus = checkTenantLockStatus;
}
