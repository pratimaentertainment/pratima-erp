'use server';

import { canonicalizeEmail } from '@/utils/anti-abuse.utils';

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { SubscriptionStatus } from '@prisma/client';

import {
  registerStudioSchema,
  type RegisterStudioInput,
} from '@/schemas/tenant.schema';

/**
 * Strict Security Guard: Enforces that the caller is an authenticated SUPER_ADMIN.
 * Throws an Error with 401/403 message if unauthorized.
 */
async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !user || !user.id) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const role = user.role;
  const roles = user.roles || [];
  const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin) {
    throw new Error('Forbidden: Access denied. Super Admin role required.');
  }

  return {
    userId: user.id as string,
    email: user.email as string,
    name: (user.name || 'Super Admin') as string,
  };
}

/**
 * Generates a URL-safe unique slug for a studio
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
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

  // If collision exists, append a random short suffix
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

// ==========================================
// ZOD VALIDATION SCHEMAS FOR GOVERNANCE
// ==========================================

const extendTrialSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  days: z.number().int().min(1, 'Days must be at least 1').max(365, 'Cannot extend by more than 365 days'),
});

const updateTenantStatusSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  status: z.enum(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED']),
});

const resetPasswordSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
});

const updateFranchiseConfigSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  isFranchisor: z.boolean().optional(),
  parentTenantId: z.string().uuid('Invalid Parent Tenant ID').nullable().optional(),
  royaltyPercent: z.number().min(0, 'Royalty percentage cannot be negative').max(100, 'Royalty percentage cannot exceed 100%').nullable().optional(),
});

// ==========================================
// 1. CORE SUPER ADMIN ACTIONS
// ==========================================

/**
 * Super Admin: Register a new studio tenant with anti-abuse guards and atomic transaction
 */
export async function registerStudioAction(input: RegisterStudioInput) {
  try {
    // 0. Enforce Super Admin authorization
    await requireSuperAdmin();

    const validated = registerStudioSchema.parse(input);

    // 1. Check Anti-Abuse: Mobile uniqueness
    const normalizedPhone = validated.contactPhone.trim();
    const existingPhone = await prisma.tenant.findUnique({
      where: { contactPhone: normalizedPhone },
    });
    if (existingPhone) {
      return {
        success: false,
        error: `Mobile number "${normalizedPhone}" is already registered with an existing studio.`,
      };
    }

    // 2. Check Anti-Abuse: PAN uniqueness
    const normalizedPan = validated.panNumber ? validated.panNumber.trim().toUpperCase() : null;
    if (normalizedPan) {
      const existingPan = await prisma.tenant.findUnique({
        where: { panNumber: normalizedPan },
      });
      if (existingPan) {
        return {
          success: false,
          error: `PAN number "${normalizedPan}" is already registered with another studio.`,
        };
      }
    }

    // 3. User email uniqueness
    const normalizedEmail = validated.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return {
        success: false,
        error: `User account with email "${normalizedEmail}" already exists.`,
      };
    }

    // 4. Generate URL-friendly unique slug
    const slug = await generateUniqueSlug(validated.name);

    // 5. Determine trial period vs lifetime internal access
    const isLifetime = validated.accountType === 'INTERNAL_LIFETIME';
    const subscriptionStatus: SubscriptionStatus = isLifetime ? 'ACTIVE' : 'TRIAL';
    const trialEndsAt = isLifetime ? null : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // 6. Generate temporary hashed password
    const hashedPassword = await bcrypt.hash('Studio@123', 10);

    // 7. Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Tenant record
      const tenant = await tx.tenant.create({
        data: {
          name: validated.name.trim(),
          slug,
          contactPhone: normalizedPhone,
          panNumber: normalizedPan,
          subscriptionStatus,
          trialEndsAt,
          phone: normalizedPhone,
          email: normalizedEmail,
        },
      });

      // If internal lifetime studio, provision permanent active Enterprise subscription
      if (isLifetime) {
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planTier: 'ENTERPRISE',
            status: 'ACTIVE',
            expiresAt: null,
          },
        });
      }

      // Create default Head Office branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Headquarters',
          isHeadOffice: true,
          isActive: true,
        },
      });

      // Create initial User with role TENANT_OWNER
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: normalizedEmail,
          canonicalEmail: canonicalizeEmail(normalizedEmail),
          name: `${validated.name.trim()} Owner`,
          passwordHash: hashedPassword,
          role: 'TENANT_OWNER',
          status: 'ACTIVE',
          canLogin: true,
          mustChangePassword: true,
        },
      });

      // Associate User with Headquarters branch as primary
      await tx.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
          isActive: true,
        },
      });

      return { tenant, user, branch };
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      data: {
        tenantId: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        contactPhone: result.tenant.contactPhone,
        ownerEmail: result.user.email,
        temporaryPassword: 'Studio@123',
        accountType: validated.accountType,
        subscriptionStatus: result.tenant.subscriptionStatus,
      },
    };
  } catch (error: any) {
    console.error('[registerStudioAction] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while registering the studio.',
    };
  }
}

/**
 * Super Admin: Fetch all registered studios
 */
export async function getStudiosAction() {
  try {
    // 0. Enforce Super Admin authorization
    await requireSuperAdmin();

    const studios = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        signupIp: true,
        deviceFingerprint: true,
        isSuspectedDuplicate: true,
        contactPhone: true,
        email: true,
        panNumber: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            branches: true,
          },
        },
      },
    });

    return { success: true, data: studios };
  } catch (error: any) {
    console.error('[getStudiosAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve studios',
      data: [],
    };
  }
}

/**
 * Super Admin: Hard delete a studio tenant and cascade-remove all related records
 */
export async function deleteTenantAction(tenantId: string) {
  try {
    // 0. Enforce Super Admin authorization
    await requireSuperAdmin();

    if (!tenantId || typeof tenantId !== 'string') {
      return {
        success: false,
        error: 'A valid Tenant ID must be provided.',
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return {
        success: false,
        error: 'Studio not found or already deleted.',
      };
    }

    // Hard delete tenant with schema-level cascade to branches, users, subscriptions, roles, etc.
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Studio "${tenant.name}" was permanently deleted.`,
    };
  } catch (error: any) {
    console.error('[deleteTenantAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete studio.',
    };
  }
}

// ==========================================
// 2. TENANT GOVERNANCE ACTIONS (PHASE 15.1)
// ==========================================

/**
 * Super Admin: Extend trial duration for any studio tenant by X days.
 */
export async function extendTenantTrialAction(tenantId: string, days: number) {
  try {
    await requireSuperAdmin();
    const validated = extendTrialSchema.parse({ tenantId, days });

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: { id: true, name: true, trialEndsAt: true, subscriptionStatus: true },
    });

    if (!tenant) {
      return { success: false, error: 'Studio tenant not found.' };
    }

    const now = new Date();
    // If current trialEndsAt is in the future, extend from that timestamp; otherwise from now
    const baseDate = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > now
      ? new Date(tenant.trialEndsAt)
      : now;

    const newTrialEndsAt = new Date(baseDate.getTime() + validated.days * 24 * 60 * 60 * 1000);

    // If currently PAST_DUE or CANCELLED, reset to TRIAL so the tenant is unlocked
    const updatedStatus: SubscriptionStatus = tenant.subscriptionStatus === 'ACTIVE' ? 'ACTIVE' : 'TRIAL';

    const updated = await prisma.tenant.update({
      where: { id: validated.tenantId },
      data: {
        trialEndsAt: newTrialEndsAt,
        subscriptionStatus: updatedStatus,
      },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Trial for "${tenant.name}" extended by ${validated.days} days (valid until ${newTrialEndsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).`,
      data: {
        trialEndsAt: updated.trialEndsAt?.toISOString(),
        subscriptionStatus: updated.subscriptionStatus,
      },
    };
  } catch (error: any) {
    console.error('[extendTenantTrialAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to extend tenant trial.',
    };
  }
}

/**
 * Super Admin: Update subscription status (ACTIVE, TRIAL, PAST_DUE, CANCELLED).
 * Allows soft-locking / suspending or reactivating any studio without data loss.
 */
export async function updateTenantStatusAction(tenantId: string, status: string) {
  try {
    await requireSuperAdmin();
    const validated = updateTenantStatusSchema.parse({ tenantId, status });

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: { id: true, name: true, subscriptionStatus: true },
    });

    if (!tenant) {
      return { success: false, error: 'Studio tenant not found.' };
    }

    const updated = await prisma.tenant.update({
      where: { id: validated.tenantId },
      data: {
        subscriptionStatus: validated.status as SubscriptionStatus,
      },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Subscription status for "${tenant.name}" updated to ${validated.status}.`,
      data: {
        subscriptionStatus: updated.subscriptionStatus,
      },
    };
  } catch (error: any) {
    console.error('[updateTenantStatusAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update tenant status.',
    };
  }
}

/**
 * Super Admin: Generate a new temporary password for the tenant's primary owner account.
 * Enables emergency support password recovery directly from the Super Admin console.
 */
export async function resetTenantOwnerPasswordAction(tenantId: string) {
  try {
    await requireSuperAdmin();
    const validated = resetPasswordSchema.parse({ tenantId });

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: 'Studio tenant not found.' };
    }

    // Find the primary owner or administrator for this tenant
    const ownerUser = (await prisma.user.findFirst({
      where: {
        tenantId: validated.tenantId,
        deletedAt: null,
        role: 'TENANT_OWNER',
      },
      orderBy: { createdAt: 'asc' },
    })) || (await prisma.user.findFirst({
      where: {
        tenantId: validated.tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    }));

    if (!ownerUser) {
      return {
        success: false,
        error: `No primary owner or administrator account found for "${tenant.name}".`,
      };
    }

    // Generate cryptographically random secure temporary password
    const randomHex = crypto.randomBytes(4).toString('hex');
    const temporaryPassword = `Pratima@${randomHex}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id: ownerUser.id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        isLocked: false,
        lockUntil: null,
      },
    });

    return {
      success: true,
      message: `Password reset successfully for owner ${ownerUser.email}.`,
      data: {
        ownerEmail: ownerUser.email,
        ownerName: ownerUser.name,
        temporaryPassword,
      },
    };
  } catch (error: any) {
    console.error('[resetTenantOwnerPasswordAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset tenant owner password.',
    };
  }
}

/**
 * Super Admin: Update tenant franchise configuration (Franchisor status, Parent Franchisor binding, Royalty %)
 */
export async function updateTenantFranchiseConfigAction(
  tenantId: string,
  payload: {
    isFranchisor?: boolean;
    parentTenantId?: string | null;
    royaltyPercent?: number | null;
  }
) {
  try {
    await requireSuperAdmin();
    const validated = updateFranchiseConfigSchema.parse({
      tenantId,
      ...payload,
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: { id: true, name: true, parentTenantId: true },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant studio not found.' };
    }

    // Anti-circular binding validation: Tenant cannot be its own parent
    if (validated.parentTenantId && validated.parentTenantId === validated.tenantId) {
      return {
        success: false,
        error: 'Invalid hierarchy: A tenant studio cannot be assigned as its own parent franchisor.',
      };
    }

    // If binding to a parent, verify parent exists and is designated as a franchisor
    if (validated.parentTenantId) {
      const parentTenant = await prisma.tenant.findUnique({
        where: { id: validated.parentTenantId },
        select: { id: true, name: true, parentTenantId: true, isFranchisor: true },
      });

      if (!parentTenant) {
        return { success: false, error: 'Selected parent franchisor tenant does not exist.' };
      }

      // Prevent multi-hop circular loops: parent's parent cannot be current tenant
      if (parentTenant.parentTenantId === validated.tenantId) {
        return {
          success: false,
          error: 'Circular franchise relationship detected: Parent franchisor is already linked to this tenant.',
        };
      }

      // Automatically ensure parent has isFranchisor = true
      if (!parentTenant.isFranchisor) {
        await prisma.tenant.update({
          where: { id: parentTenant.id },
          data: { isFranchisor: true },
        });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: validated.tenantId },
      data: {
        ...(validated.isFranchisor !== undefined ? { isFranchisor: validated.isFranchisor } : {}),
        ...(validated.parentTenantId !== undefined ? { parentTenantId: validated.parentTenantId } : {}),
        ...(validated.royaltyPercent !== undefined ? { royaltyPercent: validated.royaltyPercent } : {}),
      },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Franchise settings updated for "${tenant.name}".`,
      data: {
        id: updated.id,
        isFranchisor: updated.isFranchisor,
        parentTenantId: updated.parentTenantId,
        royaltyPercent: updated.royaltyPercent ? Number(updated.royaltyPercent) : null,
      },
    };
  } catch (error: any) {
    console.error('[updateTenantFranchiseConfigAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update tenant franchise configuration.',
    };
  }
}


/**
 * Super Admin: Update individual studio feature add-ons (enabledAddons)
 */
export async function updateTenantAddonsAction(tenantId: string, enabledAddons: string[]) {
  try {
    await requireSuperAdmin();

    if (!tenantId) {
      return { success: false, error: 'Tenant ID is required.' };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant studio not found.' };
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        enabledAddons,
      },
      select: {
        id: true,
        name: true,
        enabledAddons: true,
      },
    });

    revalidatePath('/super-admin');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Updated feature add-ons for "". (${enabledAddons.length} active add-ons)`,
      data: updated,
    };
  } catch (error: any) {
    console.error('[updateTenantAddonsAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update tenant add-ons.',
    };
  }
}


/**
 * Super Admin: Activate or switch a studio's Base Plan and assign custom Add-ons in 1 click
 */
export async function activateTenantPlanAndAddonsAction(params: {
  tenantId: string;
  planId: string;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  enabledAddons: string[];
}) {
  try {
    await requireSuperAdmin();
    const { tenantId, planId, billingCycle = 'MONTHLY', enabledAddons } = params;

    if (!tenantId || !planId) {
      return { success: false, error: 'Tenant ID and Plan ID are required.' };
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return { success: false, error: 'Subscription plan not found.' };
    }

    const durationDays = billingCycle === 'ANNUAL' ? 365 : 30;
    const newEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          planId: plan.id,
          billingCycle: billingCycle as any,
          startDate: new Date(),
          endDate: newEndDate,
        },
        create: {
          tenantId,
          planId: plan.id,
          billingCycle: billingCycle as any,
          startDate: new Date(),
          endDate: newEndDate,
        },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          enabledAddons,
        },
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          enabledAddons: true,
        },
      });

      return { sub, updatedTenant };
    });

    revalidatePath('/super-admin');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Studio "${result.updatedTenant.name}" activated on "${plan.name}" with ${enabledAddons.length} active add-on(s).`,
      data: result,
    };
  } catch (error: any) {
    console.error('[activateTenantPlanAndAddonsAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to activate plan and add-ons.',
    };
  }
}

/**
 * Super Admin: Immediately revoke a free-trial and hard-lock the studio workspace.
 * Used for anti-abuse enforcement on abusive/duplicate trial accounts.
 */
export async function revokeTenantTrialAction(tenantId: string) {
  try {
    await requireSuperAdmin();
    if (!tenantId) {
      return { success: false, error: 'A valid Tenant ID is required.' };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, city: true },
    });

    if (!tenant) {
      return { success: false, error: 'Studio tenant not found.' };
    }

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        trialEndsAt: pastDate,
        subscriptionStatus: 'CANCELLED',
      },
    });

    await prisma.tenantSubscription.updateMany({
      where: { tenantId },
      data: {
        endDate: pastDate,
      },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Free trial for "${tenant.name}" (${tenant.city || 'Headquarters'}) has been immediately revoked and locked.`,
    };
  } catch (error: any) {
    console.error('[revokeTenantTrialAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to revoke tenant trial.',
    };
  }
}
