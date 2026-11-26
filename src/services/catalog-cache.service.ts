import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Cached fetcher for active subscription plans.
 * Global non-tenant catalog table: safe for cross-request caching.
 * Revalidates every 120 seconds or on-demand via revalidateTag('subscription-plans').
 */
export const getCachedSubscriptionPlans = unstable_cache(
  async () => {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
    });
  },
  ['active-subscription-plans'],
  {
    revalidate: 120,
    tags: ['subscription-plans'],
  }
);

/**
 * Cached fetcher for active modular plan add-on configurations.
 * Global non-tenant catalog table: safe for cross-request caching.
 * Revalidates every 120 seconds or on-demand via revalidateTag('plan-addons').
 */
export const getCachedPlanAddons = unstable_cache(
  async () => {
    return prisma.planAddonConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },
  ['active-plan-addons'],
  {
    revalidate: 120,
    tags: ['plan-addons'],
  }
);
