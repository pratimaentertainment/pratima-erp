'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import {
  publicSignupSchema,
  type PublicSignupInput,
} from '@/schemas/auth.schema';
import { DealerCommissionService } from '@/services/billing/dealer-commission.service';

/**
 * Generates a URL-safe unique slug for a newly registered public studio
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'studio';

  const existing = await prisma.tenant.findUnique({
    where: { slug: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  // If collision exists, append a short random alphanumeric suffix
  for (let i = 0; i < 5; i++) {
    const candidate = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const collision = await prisma.tenant.findUnique({
      where: { slug: candidate },
    });
    if (!collision) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString().slice(-4)}`;
}

/**
 * Public Signup: Register a new studio tenant and owner user atomically
 * with automatic dealer referral attribution.
 */
export async function registerPublicStudioAction(input: PublicSignupInput) {
  try {
    const validated = publicSignupSchema.parse(input);

    // 1. Normalize contact phone and verify anti-abuse uniqueness
    const rawMobile = validated.mobileNumber.trim();
    const formattedPhone = `+91 ${rawMobile}`;

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { contactPhone: rawMobile },
          { contactPhone: formattedPhone },
          { contactPhone: `+91${rawMobile}` },
          { phone: rawMobile },
          { phone: formattedPhone },
        ],
      },
    });

    if (existingTenant) {
      return {
        success: false,
        error: `Mobile number "${rawMobile}" is already registered with an existing studio. Please log in or use another number.`,
      };
    }

    // 2. Normalize email and check if user account already exists
    const normalizedEmail = validated.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: `An account with email "${normalizedEmail}" already exists. Please log in instead.`,
      };
    }

    // 3. Generate unique URL slug
    const slug = await generateUniqueSlug(validated.studioName);

    // 4. Hash user password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // 5. Compute 15-day trial period expiration
    const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // 6. Find selected plan or fallback to lowest active starter plan
    let targetPlan = null;
    if (validated.planId) {
      targetPlan = await prisma.subscriptionPlan.findFirst({
        where: { id: validated.planId, isActive: true },
      });
    }

    if (!targetPlan) {
      targetPlan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      });
    }

    // 7. Resolve dealer referral code if provided
    let referredByDealerId: string | null = null;
    if (validated.referralCode && validated.referralCode.trim()) {
      const activeDealer = await DealerCommissionService.resolveActiveDealerByCode(
        validated.referralCode.trim()
      );
      if (activeDealer) {
        referredByDealerId = activeDealer.id;
      }
    }

    // 8. Atomic Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Tenant with TRIAL subscription status & optional dealer referral
      const tenant = await tx.tenant.create({
        data: {
          name: validated.studioName.trim(),
          slug,
          contactPhone: formattedPhone,
          phone: formattedPhone,
          email: normalizedEmail,
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
          referredByDealerId,
        },
      });

      // Create default Headquarters branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Headquarters',
          isHeadOffice: true,
          isActive: true,
        },
      });

      // Create initial User with explicit Admin role Role.TENANT_OWNER
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: normalizedEmail,
          name: validated.ownerName.trim(),
          passwordHash: hashedPassword,
          role: Role.TENANT_OWNER,
          status: 'ACTIVE',
          canLogin: true,
        },
      });

      // Associate User with Headquarters branch
      await tx.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
          isActive: true,
        },
      });

      // Associate Tenant with selected Subscription Plan on 15-day Trial
      if (targetPlan) {
        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: targetPlan.id,
            billingCycle: validated.billingCycle || 'MONTHLY',
            startDate: new Date(),
            endDate: trialEndsAt,
          },
        });
      }

      return { tenant, user, branch, plan: targetPlan };
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Studio "${result.tenant.name}" registered successfully! Please log in to continue.`,
      data: {
        tenantId: result.tenant.id,
        studioName: result.tenant.name,
        slug: result.tenant.slug,
        email: result.user.email,
        planId: result.plan?.id,
        planName: result.plan?.name,
      },
    };
  } catch (error: any) {
    console.error('[registerPublicStudioAction] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while registering your studio. Please try again.',
    };
  }
}
