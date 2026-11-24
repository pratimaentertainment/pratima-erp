'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createPlanSchema,
  updatePlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@/schemas/subscription.schema';

/**
 * Super Admin: Create a new SaaS subscription plan tier
 */
export async function createSubscriptionPlanAction(input: CreatePlanInput) {
  try {
    // 1. Enforce Super Admin authorization
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only platform Super Admins can configure subscription plans.',
      };
    }

    // 2. Validate input schema
    const validated = createPlanSchema.parse(input);

    // 3. Check for unique slug collisions
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

    // Auto-sync allowFranchises if FRANCHISE_NETWORK is in features
    const hasFranchiseFeature = (validated.features || []).includes('FRANCHISE_NETWORK');
    const allowFranchises = validated.allowFranchises || hasFranchiseFeature;

    // 4. Create new SubscriptionPlan record in Prisma
    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name: validated.name.trim(),
        slug: normalizedSlug,
        monthlyPrice: validated.monthlyPrice,
        annualPrice: validated.annualPrice,
        maxBranches: validated.maxBranches,
        maxStaff: validated.maxStaff,
        features: validated.features ?? [],
        smsCredits: validated.smsCredits ?? 0,
        whatsappCredits: validated.whatsappCredits ?? 0,
        allowFranchises,
        perFranchiseMonthlyPrice: validated.perFranchiseMonthlyPrice ?? 0,
        perFranchiseAnnualPrice: validated.perFranchiseAnnualPrice ?? 0,
        isActive: validated.isActive ?? true,
      },
    });

    // 5. Revalidate super admin cache
    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Subscription plan "${newPlan.name}" created successfully.`,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        slug: newPlan.slug,
        monthlyPrice: Number(newPlan.monthlyPrice),
        annualPrice: Number(newPlan.annualPrice),
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
        monthlyPrice: validated.monthlyPrice,
        annualPrice: validated.annualPrice,
        maxBranches: validated.maxBranches,
        maxStaff: validated.maxStaff,
        ...(validated.features !== undefined ? { features: validated.features } : {}),
        ...(validated.smsCredits !== undefined ? { smsCredits: validated.smsCredits } : {}),
        ...(validated.whatsappCredits !== undefined ? { whatsappCredits: validated.whatsappCredits } : {}),
        ...(allowFranchises !== undefined ? { allowFranchises } : {}),
        ...(validated.perFranchiseMonthlyPrice !== undefined ? { perFranchiseMonthlyPrice: validated.perFranchiseMonthlyPrice } : {}),
        ...(validated.perFranchiseAnnualPrice !== undefined ? { perFranchiseAnnualPrice: validated.perFranchiseAnnualPrice } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    revalidatePath('/super-admin/subscriptions');
    revalidatePath('/pricing');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Subscription plan "${updatedPlan.name}" updated successfully.`,
      plan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        slug: updatedPlan.slug,
        monthlyPrice: Number(updatedPlan.monthlyPrice),
        annualPrice: Number(updatedPlan.annualPrice),
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
