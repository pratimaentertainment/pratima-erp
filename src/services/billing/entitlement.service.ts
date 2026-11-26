import { prisma } from '@/lib/prisma';
import {
  PlanFeatureKey,
  PLAN_FEATURE_KEYS,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';
import { checkTenantLockStatus } from './subscription-guard.service';

export interface TenantEntitlements {
  tenantId: string;
  planId?: string | null;
  planName: string;
  planSlug: string;
  maxBranches: number;
  extraBranchUnits: number;
  totalAllowedBranches: number;
  maxStaff: number;
  extraStaffUnits: number;
  totalAllowedLoginStaff: number;
  freelancersAllowed: 'UNLIMITED';
  features: PlanFeatureKey[];
  activeFeatures: Set<PlanFeatureKey>;
  enabledAddons: string[];
  franchiseEnabled?: boolean;
  includedAddons: string[];
  effectiveMaxBranches: number;
  effectiveMaxStaff: number;
  aiEventCredits: number;
  isTrial: boolean;
  isActive: boolean;
  isLocked: boolean;
  lockReason: string;
}

export class EntitlementError extends Error {
  public code: 'FEATURE_LOCKED' | 'PLAN_LIMIT_EXCEEDED' | 'TENANT_LOCKED';
  public featureKey?: PlanFeatureKey;
  public limit?: number;
  public currentUsage?: number;

  constructor(
    message: string,
    code: 'FEATURE_LOCKED' | 'PLAN_LIMIT_EXCEEDED' | 'TENANT_LOCKED',
    options?: { featureKey?: PlanFeatureKey; limit?: number; currentUsage?: number }
  ) {
    super(message);
    this.name = 'EntitlementError';
    this.code = code;
    this.featureKey = options?.featureKey;
    this.limit = options?.limit;
    this.currentUsage = options?.currentUsage;
  }
}

/**
 * Resolves default features for legacy plans that have empty features arrays
 */
function resolvePlanFeatures(slug: string, storedFeatures: string[]): PlanFeatureKey[] {
  if (storedFeatures && storedFeatures.length > 0) {
    return storedFeatures.filter((k): k is PlanFeatureKey =>
      (PLAN_FEATURE_KEYS as readonly string[]).includes(k)
    );
  }

  // Fallback defaults based on slug
  if (slug.includes('enterprise')) {
    return [...ENTERPRISE_DEFAULT_FEATURES];
  }
  if (slug.includes('pro')) {
    return [...PRO_DEFAULT_FEATURES];
  }
  return [...STARTER_DEFAULT_FEATURES];
}

/**
 * Resolves full entitlement matrix for a studio tenant, factoring in:
 * 1. Active subscription tier quotas and features
 * 2. Parent franchisor plan inheritance (for sub-franchises)
 * 3. Individual tenant-level enabled Add-ons (`enabledAddons`)
 * 4. Lockout status
 */
export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  if (!tenantId) {
    return {
      tenantId: '',
      planName: 'None',
      planSlug: 'none',
      maxBranches: 1,
      maxStaff: 3,
      features: [],
      activeFeatures: new Set(),
      enabledAddons: [],
      isTrial: false,
      isActive: false,
      isLocked: true,
      lockReason: 'NO_TENANT',
      franchiseEnabled: false,
      includedAddons: [],
      effectiveMaxBranches: 1,
            aiEventCredits: 0,
      extraBranchUnits: 0,
      totalAllowedBranches: 1,
      extraStaffUnits: 0,
      totalAllowedLoginStaff: 3,
      freelancersAllowed: 'UNLIMITED',
      effectiveMaxStaff: 3,
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      parentTenantId: true,
      isFranchisor: true,
      enabledAddons: true,
      aiEventCredits: true,
      extraBranchUnits: true,
      extraStaffUnits: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      parentTenant: {
        select: {
          id: true,
          subscriptionStatus: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    return {
      tenantId,
      planName: 'Unknown',
      planSlug: 'unknown',
      maxBranches: 1,
      maxStaff: 3,
      features: [],
      activeFeatures: new Set(),
      enabledAddons: [],
      isTrial: false,
      isActive: false,
      isLocked: true,
      lockReason: 'TENANT_NOT_FOUND',
      franchiseEnabled: false,
      includedAddons: [],
      effectiveMaxBranches: 1,
            aiEventCredits: 0,
      extraBranchUnits: 0,
      totalAllowedBranches: 1,
      extraStaffUnits: 0,
      totalAllowedLoginStaff: 3,
      freelancersAllowed: 'UNLIMITED',
      effectiveMaxStaff: 3,
    };
  }

  // Check hard lockout status
  const lockStatus = await checkTenantLockStatus(tenantId);

  // Resolve plan: either direct subscription or inherited from franchisor parent
  let activePlan = tenant.subscription?.plan || null;
  if (!activePlan && tenant.parentTenant?.subscription?.plan) {
    activePlan = tenant.parentTenant.subscription.plan;
  }

  const planSlug = activePlan?.slug || 'starter-studio';
  const planName = activePlan?.name || 'Starter Studio';
  const maxBranches = activePlan?.maxBranches ?? 1;
  const maxStaff = activePlan?.maxStaff ?? 3;

    const baseBranches = activePlan?.maxBranches ?? 1;
  const baseStaff = activePlan?.maxStaff ?? 3;
  const extraBranchUnits = tenant.extraBranchUnits || 0;
  const extraStaffUnits = tenant.extraStaffUnits || 0;

  const totalAllowedBranches = baseBranches + extraBranchUnits;
  const totalAllowedLoginStaff = baseStaff + (extraStaffUnits * 5);

  const franchiseEnabled = Boolean(activePlan?.franchiseEnabled || activePlan?.allowFranchises);
  const includedAddons = activePlan?.includedAddons || [];

  // Resolve plan features + merge individual tenant add-ons
  const basePlanFeatures = resolvePlanFeatures(planSlug, activePlan?.features || []);
  const tenantAddons = (tenant.enabledAddons || []).filter((k): k is PlanFeatureKey =>
    (PLAN_FEATURE_KEYS as readonly string[]).includes(k)
  );

  const combinedFeatures = Array.from(new Set([...basePlanFeatures, ...tenantAddons]));
  const activeFeaturesSet = new Set<PlanFeatureKey>(combinedFeatures);

  return {
    tenantId,
    planId: activePlan?.id || null,
    planName,
    planSlug,
    maxBranches: baseBranches,
    extraBranchUnits,
    totalAllowedBranches,
    maxStaff: baseStaff,
    extraStaffUnits,
    totalAllowedLoginStaff,
    freelancersAllowed: 'UNLIMITED',
    features: combinedFeatures,
    activeFeatures: activeFeaturesSet,
    enabledAddons: tenant.enabledAddons || [],
    franchiseEnabled,
    includedAddons,
    effectiveMaxBranches: totalAllowedBranches,
    effectiveMaxStaff: totalAllowedLoginStaff,
    aiEventCredits: tenant.aiEventCredits ?? 0,
    isTrial: tenant.subscriptionStatus === 'TRIAL',
    isActive: tenant.subscriptionStatus === 'ACTIVE',
    isLocked: lockStatus.isLocked,
    lockReason: lockStatus.reason,
  };
}

/**
 * Checks whether a tenant has access to a specific feature
 */
export async function hasTenantFeature(
  tenantId: string,
  featureKey: PlanFeatureKey
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.activeFeatures.has(featureKey);
}

/**
 * Asserts that a tenant has access to a feature. Throws EntitlementError if locked.
 */
export async function assertFeatureAccess(
  tenantId: string,
  featureKey: PlanFeatureKey
): Promise<void> {
  const entitlements = await getTenantEntitlements(tenantId);

  if (entitlements.isLocked) {
    throw new EntitlementError(
      `Your studio workspace is locked due to ${entitlements.lockReason.toLowerCase().replace('_', ' ')}. Please renew your subscription.`,
      'TENANT_LOCKED'
    );
  }

  if (!entitlements.activeFeatures.has(featureKey)) {
    throw new EntitlementError(
      `The feature "${featureKey}" is not included in your ${entitlements.planName} tier. Please upgrade your plan or enable it as an add-on.`,
      'FEATURE_LOCKED',
      { featureKey }
    );
  }
}

/**
 * Hard Quota Guard: Asserts that creating a new branch won't exceed the plan's maxBranches
 */
export async function assertBranchQuota(tenantId: string): Promise<void> {
  const entitlements = await getTenantEntitlements(tenantId);

  if (entitlements.isLocked) {
    throw new EntitlementError(
      `Access suspended: ${entitlements.lockReason}`,
      'TENANT_LOCKED'
    );
  }

  const branchCount = await prisma.branch.count({
    where: { tenantId, deletedAt: null },
  });

  if (branchCount >= entitlements.totalAllowedBranches) {
    throw new EntitlementError(
      `Branch limit reached (${branchCount}/${entitlements.totalAllowedBranches}). Your plan includes ${entitlements.maxBranches} base branch${entitlements.maxBranches > 1 ? 'es' : ''} + ${entitlements.extraBranchUnits} extra add-on branch${entitlements.extraBranchUnits !== 1 ? 'es' : ''}. You can add another branch for ₹299/mo in Studio Settings.`,
      'PLAN_LIMIT_EXCEEDED',
      { limit: entitlements.totalAllowedBranches, currentUsage: branchCount }
    );
  }
}

/**
 * Hard Quota Guard: Asserts that creating a new staff user won't exceed the plan's maxStaff
 */
export async function assertStaffQuota(tenantId: string): Promise<void> {
  const entitlements = await getTenantEntitlements(tenantId);

  if (entitlements.isLocked) {
    throw new EntitlementError(
      `Access suspended: ${entitlements.lockReason}`,
      'TENANT_LOCKED'
    );
  }

  const staffCount = await prisma.user.count({
    where: { tenantId, deletedAt: null },
  });

  if (staffCount >= entitlements.totalAllowedLoginStaff) {
    throw new EntitlementError(
      `Login staff quota reached (${staffCount}/${entitlements.totalAllowedLoginStaff}). Your plan includes ${entitlements.maxStaff} base staff logins + ${entitlements.extraStaffUnits * 5} extra seats (${entitlements.extraStaffUnits} packs). You can add 5 more staff logins for ₹199/mo in Studio Settings. (Freelancers without logins are unlimited).`,
      'PLAN_LIMIT_EXCEEDED',
      { limit: entitlements.totalAllowedLoginStaff, currentUsage: staffCount }
    );
  }
}

export class EntitlementService {
  public static getTenantEntitlements = getTenantEntitlements;
  public static hasTenantFeature = hasTenantFeature;
  public static assertFeatureAccess = assertFeatureAccess;
  public static assertBranchQuota = assertBranchQuota;
  public static assertStaffQuota = assertStaffQuota;
}


export async function hasTenantAddon(
  tenantId: string,
  addonKey: string
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  if (entitlements.includedAddons.includes(addonKey)) return true;
  if (addonKey === 'AI_FACE_RECOGNITION' && entitlements.includedAddons.includes('AI_FACE_RECOGNITION_SINGLE')) return true;
  if (addonKey === 'AI_FACE_RECOGNITION_SINGLE' && entitlements.includedAddons.includes('AI_FACE_RECOGNITION')) return true;
  if (addonKey === 'EXTRA_BRANCH' && entitlements.extraBranchUnits > 0) return true;
  if (addonKey === 'EXTRA_STAFF_5' && entitlements.extraStaffUnits > 0) return true;
  return (
    entitlements.enabledAddons.includes(addonKey) ||
    entitlements.activeFeatures.has(addonKey as PlanFeatureKey)
  );
}
