'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import {
  createPlanSchema,
  updatePlanSchema,
  upsertAddonPriceSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
  type UpsertAddonPriceInput,
} from '@/schemas/subscription.schema';
import { DEFAULT_ADDON_CONFIGS, DEFAULT_PACKAGING_PLANS } from '@/lib/constants/plan-features';

/**
 * Idempotently ensures all default add-ons exist in PlanAddonConfig.
 * Preserves any customized pricing previously set by Super Admin.
 */
export async function ensureAddonPriceListInitialized() {
  try {
    // 1. Upsert default add-ons
    for (const addon of DEFAULT_ADDON_CONFIGS) {
      await prisma.planAddonConfig.upsert({
        where: { featureKey: addon.featureKey },
        update: {}, // Do not overwrite if already initialized
        create: {
          featureKey: addon.featureKey,
          name: addon.name,
          description: addon.description,
          originalMonthlyPrice: addon.originalMonthlyPrice,
          monthlyPrice: addon.monthlyPrice,
          originalAnnualPrice: addon.originalAnnualPrice,
          annualPrice: addon.annualPrice,
          billingType: addon.billingType || 'RECURRING',
          creditsIncluded: addon.creditsIncluded || 0,
          sortOrder: addon.sortOrder,
          isActive: true,
        },
      });
    }

    // 2. Purge legacy add-ons not in the 5 canonical items
    await prisma.planAddonConfig.deleteMany({
      where: {
        featureKey: {
          notIn: [
            'EXTRA_BRANCH',
            'EXTRA_STAFF_5',
            'AI_FACE_RECOGNITION_SINGLE',
            'AI_FACE_RECOGNITION_PACK_10',
            'BROADCAST_MESSAGING',
          ],
        },
      },
    });

    // 3. Ensure canonical 3 base plans exist in database
    for (const plan of DEFAULT_PACKAGING_PLANS) {
      await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          originalMonthlyPrice: plan.originalMonthlyPrice,
          monthlyPrice: plan.monthlyPrice,
          originalAnnualPrice: plan.originalAnnualPrice,
          annualPrice: plan.annualPrice,
          offerBadgeText: plan.offerBadgeText,
          isBasePlan: plan.isBasePlan,
          sortOrder: plan.sortOrder,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled,
          includedAddons: plan.includedAddons,
          features: plan.features,
          isActive: true,
        },
        create: {
          slug: plan.slug,
          name: plan.name,
          originalMonthlyPrice: plan.originalMonthlyPrice,
          monthlyPrice: plan.monthlyPrice,
          originalAnnualPrice: plan.originalAnnualPrice,
          annualPrice: plan.annualPrice,
          offerBadgeText: plan.offerBadgeText,
          isBasePlan: plan.isBasePlan,
          sortOrder: plan.sortOrder,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled,
          includedAddons: plan.includedAddons,
          features: plan.features,
          isActive: true,
        },
      });
    }

    // 4. Re-point legacy subscriptions and purge legacy plans
    const starter = await prisma.subscriptionPlan.findUnique({ where: { slug: 'starter-studio' } });
    const multi = await prisma.subscriptionPlan.findUnique({ where: { slug: 'multi-branch-pro' } });
    const higher = await prisma.subscriptionPlan.findUnique({ where: { slug: 'franchise-higher' } });

    if (starter && multi && higher) {
      const legacyPlans = await prisma.subscriptionPlan.findMany({
        where: { slug: { notIn: ['starter-studio', 'multi-branch-pro', 'franchise-higher'] } },
      });

      for (const lp of legacyPlans) {
        let targetPlanId = starter.id;
        if (lp.slug.includes('pro')) targetPlanId = multi.id;
        else if (lp.slug.includes('enterprise') || lp.slug.includes('franchise')) targetPlanId = higher.id;

        await prisma.tenantSubscription.updateMany({
          where: { planId: lp.id },
          data: { planId: targetPlanId },
        });
      }

      await prisma.subscriptionPlan.deleteMany({
        where: { slug: { notIn: ['starter-studio', 'multi-branch-pro', 'franchise-higher'] } },
      });
    }
  } catch (err) {
    console.error('[ensureAddonPriceListInitialized] Error:', err);
  }
}

/**
 * Super Admin & Public: Retrieve centralized Add-on Price List
 */
export async function getAddonPriceListAction() {
  try {
    await ensureAddonPriceListInitialized();
    const addons = await prisma.planAddonConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      success: true,
      data: addons.map((a) => ({
        id: a.id,
        featureKey: a.featureKey,
        name: a.name,
        description: a.description,
        originalMonthlyPrice: a.originalMonthlyPrice ? Number(a.originalMonthlyPrice) : null,
        monthlyPrice: Number(a.monthlyPrice),
        originalAnnualPrice: a.originalAnnualPrice ? Number(a.originalAnnualPrice) : null,
        annualPrice: Number(a.annualPrice),
        billingType: a.billingType || 'RECURRING',
        creditsIncluded: a.creditsIncluded ?? 0,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
      })),
    };
  } catch (error: any) {
    console.error('[getAddonPriceListAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch add-on price list.',
      data: [],
    };
  }
}

/**
 * Super Admin: Configure an add-on's MRP, Offer prices, active state & sort order
 */
export async function upsertAddonPriceAction(payload: UpsertAddonPriceInput) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only platform Super Admins can configure add-on pricing.',
      };
    }

    const validated = upsertAddonPriceSchema.parse(payload);

    const addon = await prisma.planAddonConfig.upsert({
      where: { featureKey: validated.featureKey },
      update: {
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        originalMonthlyPrice:
          validated.originalMonthlyPrice !== undefined && validated.originalMonthlyPrice !== null
            ? validated.originalMonthlyPrice
            : null,
        monthlyPrice: validated.monthlyPrice,
        originalAnnualPrice:
          validated.originalAnnualPrice !== undefined && validated.originalAnnualPrice !== null
            ? validated.originalAnnualPrice
            : null,
        annualPrice: validated.annualPrice,
        billingType: validated.billingType || 'RECURRING',
        creditsIncluded: validated.creditsIncluded ?? 0,
        isActive: validated.isActive,
        sortOrder: validated.sortOrder,
      },
      create: {
        featureKey: validated.featureKey,
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        originalMonthlyPrice:
          validated.originalMonthlyPrice !== undefined && validated.originalMonthlyPrice !== null
            ? validated.originalMonthlyPrice
            : null,
        monthlyPrice: validated.monthlyPrice,
        originalAnnualPrice:
          validated.originalAnnualPrice !== undefined && validated.originalAnnualPrice !== null
            ? validated.originalAnnualPrice
            : null,
        annualPrice: validated.annualPrice,
        billingType: validated.billingType || 'RECURRING',
        creditsIncluded: validated.creditsIncluded ?? 0,
        isActive: validated.isActive,
        sortOrder: validated.sortOrder,
      },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');
    updateTag('plan-addons');

    return {
      success: true,
      message: `Add-on "${addon.name}" pricing updated successfully.`,
      data: {
        id: addon.id,
        featureKey: addon.featureKey,
        name: addon.name,
        description: addon.description,
        originalMonthlyPrice: addon.originalMonthlyPrice ? Number(addon.originalMonthlyPrice) : null,
        monthlyPrice: Number(addon.monthlyPrice),
        originalAnnualPrice: addon.originalAnnualPrice ? Number(addon.originalAnnualPrice) : null,
        annualPrice: Number(addon.annualPrice),
        isActive: addon.isActive,
        sortOrder: addon.sortOrder,
      },
    };
  } catch (error: any) {
    console.error('[upsertAddonPriceAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update add-on pricing.',
    };
  }
}

/**
 * Super Admin: Create a new SaaS subscription plan tier
 */
export async function createSubscriptionPlanAction(input: CreatePlanInput) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only platform Super Admins can configure subscription plans.',
      };
    }

    const validated = createPlanSchema.parse(input);

    const normalizedSlug = validated.slug.toLowerCase().trim();
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existingPlan) {
      return {
        success: false,
        error: `A subscription plan with slug "${normalizedSlug}" already exists. Please choose a unique slug.`,
      };
    }

    // If marked as Base Plan, unmark any existing Base Plan
    if (validated.isBasePlan) {
      await prisma.subscriptionPlan.updateMany({
        where: { isBasePlan: true },
        data: { isBasePlan: false },
      });
    }

    // Auto-sync allowFranchises if FRANCHISE_NETWORK is in features
    const hasFranchiseFeature = (validated.features || []).includes('FRANCHISE_NETWORK');
    const allowFranchises = validated.allowFranchises || hasFranchiseFeature;

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name: validated.name.trim(),
        slug: normalizedSlug,
        originalMonthlyPrice:
          validated.originalMonthlyPrice !== undefined && validated.originalMonthlyPrice !== null
            ? validated.originalMonthlyPrice
            : null,
        monthlyPrice: validated.monthlyPrice,
        originalAnnualPrice:
          validated.originalAnnualPrice !== undefined && validated.originalAnnualPrice !== null
            ? validated.originalAnnualPrice
            : null,
        annualPrice: validated.annualPrice,
        offerBadgeText: validated.offerBadgeText?.trim() || null,
        isBasePlan: validated.isBasePlan ?? false,
        sortOrder: validated.sortOrder ?? 0,
        maxBranches: validated.maxBranches,
        maxStaff: validated.maxStaff,
        features: validated.features ?? [],
        smsCredits: validated.smsCredits ?? 0,
        whatsappCredits: validated.whatsappCredits ?? 0,
        allowFranchises: validated.allowFranchises ?? validated.franchiseEnabled ?? false,
        franchiseEnabled: validated.franchiseEnabled ?? validated.allowFranchises ?? false,
        includedAddons: validated.includedAddons ?? [],
        perFranchiseMonthlyPrice: validated.perFranchiseMonthlyPrice ?? 0,
        perFranchiseAnnualPrice: validated.perFranchiseAnnualPrice ?? 0,
        isActive: validated.isActive ?? true,
      },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');
    updateTag('subscription-plans');

    return {
      success: true,
      message: `Subscription plan "${newPlan.name}" created successfully.`,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        slug: newPlan.slug,
        originalMonthlyPrice: newPlan.originalMonthlyPrice ? Number(newPlan.originalMonthlyPrice) : null,
        monthlyPrice: Number(newPlan.monthlyPrice),
        originalAnnualPrice: newPlan.originalAnnualPrice ? Number(newPlan.originalAnnualPrice) : null,
        annualPrice: Number(newPlan.annualPrice),
        offerBadgeText: newPlan.offerBadgeText,
        isBasePlan: newPlan.isBasePlan,
        sortOrder: newPlan.sortOrder,
        features: newPlan.features,
      },
    };
  } catch (error: any) {
    console.error('[createSubscriptionPlanAction] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while creating the subscription plan.',
    };
  }
}

/**
 * Super Admin: Toggle active status of a subscription plan
 */
export async function togglePlanActiveStatusAction(planId: string, isActive: boolean) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only Super Admins can update plan status.',
      };
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');
    updateTag('subscription-plans');

    return {
      success: true,
      message: `Plan "${updated.name}" is now ${isActive ? 'active' : 'inactive'}.`,
    };
  } catch (error: any) {
    console.error('[togglePlanActiveStatusAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update plan status.',
    };
  }
}

/**
 * Super Admin: Update an existing subscription plan tier
 */
export async function updateSubscriptionPlanAction(planId: string, input: UpdatePlanInput) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only platform Super Admins can update subscription plans.',
      };
    }

    if (!planId) {
      return { success: false, error: 'Subscription Plan ID is required.' };
    }

    const validated = updatePlanSchema.parse(input);

    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      return { success: false, error: 'Subscription plan not found.' };
    }

    // If setting as base plan, clear any existing base plan
    if (validated.isBasePlan) {
      await prisma.subscriptionPlan.updateMany({
        where: { isBasePlan: true, id: { not: planId } },
        data: { isBasePlan: false },
      });
    }

    let allowFranchises = validated.allowFranchises;
    if (validated.features !== undefined) {
      const hasFranchiseFeature = validated.features.includes('FRANCHISE_NETWORK');
      if (hasFranchiseFeature) {
        allowFranchises = true;
      }
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name: validated.name.trim(),
        ...(validated.originalMonthlyPrice !== undefined
          ? { originalMonthlyPrice: validated.originalMonthlyPrice }
          : {}),
        monthlyPrice: validated.monthlyPrice,
        ...(validated.originalAnnualPrice !== undefined
          ? { originalAnnualPrice: validated.originalAnnualPrice }
          : {}),
        annualPrice: validated.annualPrice,
        ...(validated.offerBadgeText !== undefined
          ? { offerBadgeText: validated.offerBadgeText?.trim() || null }
          : {}),
        ...(validated.isBasePlan !== undefined ? { isBasePlan: validated.isBasePlan } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        maxBranches: validated.maxBranches,
        maxStaff: validated.maxStaff,
        ...(validated.features !== undefined ? { features: validated.features } : {}),
        ...(validated.smsCredits !== undefined ? { smsCredits: validated.smsCredits } : {}),
        ...(validated.whatsappCredits !== undefined
          ? { whatsappCredits: validated.whatsappCredits }
          : {}),
        ...(allowFranchises !== undefined ? { allowFranchises } : {}),
        ...(validated.franchiseEnabled !== undefined ? { franchiseEnabled: validated.franchiseEnabled } : {}),
        ...(validated.includedAddons !== undefined ? { includedAddons: validated.includedAddons } : {}),
        ...(validated.perFranchiseMonthlyPrice !== undefined
          ? { perFranchiseMonthlyPrice: validated.perFranchiseMonthlyPrice }
          : {}),
        ...(validated.perFranchiseAnnualPrice !== undefined
          ? { perFranchiseAnnualPrice: validated.perFranchiseAnnualPrice }
          : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');
    updateTag('subscription-plans');

    return {
      success: true,
      message: `Subscription plan "${updatedPlan.name}" updated successfully.`,
      plan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        slug: updatedPlan.slug,
        originalMonthlyPrice: updatedPlan.originalMonthlyPrice
          ? Number(updatedPlan.originalMonthlyPrice)
          : null,
        monthlyPrice: Number(updatedPlan.monthlyPrice),
        originalAnnualPrice: updatedPlan.originalAnnualPrice
          ? Number(updatedPlan.originalAnnualPrice)
          : null,
        annualPrice: Number(updatedPlan.annualPrice),
        offerBadgeText: updatedPlan.offerBadgeText,
        isBasePlan: updatedPlan.isBasePlan,
        sortOrder: updatedPlan.sortOrder,
        features: updatedPlan.features,
      },
    };
  } catch (error: any) {
    console.error('[updateSubscriptionPlanAction] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while updating the subscription plan.',
    };
  }
}


/**
 * Super Admin: Sync all standard base plans and modular cost-recovery add-ons into the database.
 * Completely idempotent: updates existing plans/addons without deleting tenant data.
 */
export async function syncDefaultPackagingAction() {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only platform Super Admins can configure subscription packaging.',
      };
    }

    // 1. Sync standard base plans
    for (const plan of DEFAULT_PACKAGING_PLANS) {
      await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          originalMonthlyPrice: plan.originalMonthlyPrice,
          monthlyPrice: plan.monthlyPrice,
          originalAnnualPrice: plan.originalAnnualPrice,
          annualPrice: plan.annualPrice,
          offerBadgeText: plan.offerBadgeText,
          isBasePlan: plan.isBasePlan,
          sortOrder: plan.sortOrder,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled,
          includedAddons: plan.includedAddons,
          features: plan.features,
          isActive: true,
        },
        create: {
          slug: plan.slug,
          name: plan.name,
          originalMonthlyPrice: plan.originalMonthlyPrice,
          monthlyPrice: plan.monthlyPrice,
          originalAnnualPrice: plan.originalAnnualPrice,
          annualPrice: plan.annualPrice,
          offerBadgeText: plan.offerBadgeText,
          isBasePlan: plan.isBasePlan,
          sortOrder: plan.sortOrder,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled,
          includedAddons: plan.includedAddons,
          features: plan.features,
          isActive: true,
        },
      });
    }

    // 2. Sync standard cost-recovery & scale add-ons
    for (const addon of DEFAULT_ADDON_CONFIGS) {
      await prisma.planAddonConfig.upsert({
        where: { featureKey: addon.featureKey },
        update: {
          name: addon.name,
          description: addon.description,
          originalMonthlyPrice: addon.originalMonthlyPrice,
          monthlyPrice: addon.monthlyPrice,
          originalAnnualPrice: addon.originalAnnualPrice,
          annualPrice: addon.annualPrice,
          billingType: addon.billingType || 'RECURRING',
          creditsIncluded: addon.creditsIncluded ?? 0,
          sortOrder: addon.sortOrder,
          isActive: true,
        },
        create: {
          featureKey: addon.featureKey,
          name: addon.name,
          description: addon.description,
          originalMonthlyPrice: addon.originalMonthlyPrice,
          monthlyPrice: addon.monthlyPrice,
          originalAnnualPrice: addon.originalAnnualPrice,
          annualPrice: addon.annualPrice,
          billingType: addon.billingType || 'RECURRING',
          creditsIncluded: addon.creditsIncluded ?? 0,
          sortOrder: addon.sortOrder,
          isActive: true,
        },
      });
    }

    // 3. Purge legacy plans and legacy add-ons
    const starter = await prisma.subscriptionPlan.findUnique({ where: { slug: 'starter-studio' } });
    const multi = await prisma.subscriptionPlan.findUnique({ where: { slug: 'multi-branch-pro' } });
    const higher = await prisma.subscriptionPlan.findUnique({ where: { slug: 'franchise-higher' } });

    if (starter && multi && higher) {
      const legacyPlans = await prisma.subscriptionPlan.findMany({
        where: { slug: { notIn: ['starter-studio', 'multi-branch-pro', 'franchise-higher'] } },
      });

      for (const lp of legacyPlans) {
        let targetPlanId = starter.id;
        if (lp.slug.includes('pro')) targetPlanId = multi.id;
        else if (lp.slug.includes('enterprise') || lp.slug.includes('franchise')) targetPlanId = higher.id;

        await prisma.tenantSubscription.updateMany({
          where: { planId: lp.id },
          data: { planId: targetPlanId },
        });
      }

      await prisma.subscriptionPlan.deleteMany({
        where: { slug: { notIn: ['starter-studio', 'multi-branch-pro', 'franchise-higher'] } },
      });
    }

    await prisma.planAddonConfig.deleteMany({
      where: {
        featureKey: {
          notIn: [
            'EXTRA_BRANCH',
            'EXTRA_STAFF_5',
            'AI_FACE_RECOGNITION_SINGLE',
            'AI_FACE_RECOGNITION_PACK_10',
            'BROADCAST_MESSAGING',
          ],
        },
      },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');
    updateTag('subscription-plans');
    updateTag('plan-addons');

    return {
      success: true,
      message: 'Default SaaS base plans and modular add-on catalog synchronized successfully.',
    };
  } catch (error: any) {
    console.error('[syncDefaultPackagingAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to synchronize packaging catalog.',
    };
  }
}
