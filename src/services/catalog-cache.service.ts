import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const CANONICAL_PLAN_SLUGS = [
  'starter-studio',
  'multi-branch-pro',
  'franchise-higher',
] as const;

export const CANONICAL_ADDON_KEYS = [
  'EXTRA_BRANCH',
  'EXTRA_STAFF_5',
  'AI_FACE_RECOGNITION_SINGLE',
  'AI_FACE_RECOGNITION_PACK_10',
  'BROADCAST_MESSAGING',
] as const;

/**
 * Cached fetcher for active subscription plans.
 * Global non-tenant catalog table: safe for cross-request caching.
 * Revalidates every 120 seconds or on-demand via revalidateTag('subscription-plans').
 * Strictly filters to the 3 canonical plans.
 */
export const getCachedSubscriptionPlans = unstable_cache(
  async () => {
    return prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        slug: { in: [...CANONICAL_PLAN_SLUGS] },
      },
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
 * Strictly filters to the 5 canonical modular add-on items.
 */
export const getCachedPlanAddons = unstable_cache(
  async () => {
    return prisma.planAddonConfig.findMany({
      where: {
        isActive: true,
        featureKey: { in: [...CANONICAL_ADDON_KEYS] },
      },
      orderBy: { sortOrder: 'asc' },
    });
  },
  ['active-plan-addons'],
  {
    revalidate: 120,
    tags: ['plan-addons'],
  }
);
