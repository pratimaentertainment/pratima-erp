'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { FranchiseRoyaltyService } from '@/services/franchise-royalty.service';
import { RoyaltyStatus, SubscriptionStatus, BillingCycle } from '@prisma/client';
import {
  createFranchiseSchema,
  transferLeadSchema,
  settleRoyaltySchema,
  type CreateFranchiseInput,
} from '@/schemas/franchise.schema';

// ==========================================
// SECURITY GUARD: REQUIRE FRANCHISOR OR SUPER ADMIN
// ==========================================
async function requireFranchisorContext() {
  const context = await getActiveContext();
  if (!context || !context.tenantId) {
    throw new Error('Unauthorized: No active tenant workspace session.');
  }

  const isSuperAdmin =
    context.user?.role === 'SUPER_ADMIN' ||
    (context.user?.roles || []).includes('SUPER_ADMIN');

  // Verify tenant franchisor status
  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      isFranchisor: true,
      parentTenantId: true,
    },
  });

  if (!tenant) {
    throw new Error('Tenant workspace not found.');
  }

  if (!isSuperAdmin && !tenant.isFranchisor) {
    throw new Error(
      'Forbidden: Franchise Network capabilities are restricted to Master Franchisors or Platform Super Admins.'
    );
  }

  return {
    franchisorId: tenant.id,
    franchisorName: tenant.name,
    isSuperAdmin,
    userId: context.userId,
    userEmail: context.user?.email || '',
  };
}

/**
 * Generates a clean URL slug for new franchisee
 */
async function generateUniqueFranchiseSlug(baseName: string): Promise<string> {
  const base =
    baseName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'franchise';

  const existing = await prisma.tenant.findUnique({
    where: { slug: base },
  });

  if (!existing) return base;

  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${Math.random().toString(36).substring(2, 6)}`;
    const collision = await prisma.tenant.findUnique({
      where: { slug: candidate },
    });
    if (!collision) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-4)}`;
}

// ==========================================
// 1. GET FRANCHISOR DASHBOARD ACTION
// ==========================================
export async function getFranchisorDashboardAction() {
  try {
    const { franchisorId, franchisorName } = await requireFranchisorContext();

    // 1. Fetch Franchisor Tenant & Active Subscription Plan
    const franchisor = await prisma.tenant.findUnique({
      where: { id: franchisorId },
      select: {
        id: true,
        name: true,
        slug: true,
        isFranchisor: true,
        royaltyPercent: true,
        subscriptionStatus: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!franchisor) {
      return { success: false, error: 'Franchisor workspace not found.' };
    }

    const activeSub = franchisor.subscription || null;
    const plan = activeSub?.plan || null;

    // 2. Query all linked Franchisee Tenants
    const franchisees = await prisma.tenant.findMany({
      where: {
        parentTenantId: franchisorId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        royaltyPercent: true,
        subscriptionStatus: true,
        createdAt: true,
        users: {
          where: { role: 'TENANT_OWNER', deletedAt: null },
          select: { name: true, email: true, phone: true },
          take: 1,
        },
        eventBookings: {
          where: { deletedAt: null },
          select: { id: true },
        },
        franchiseeRoyalties: {
          select: {
            id: true,
            grossAmount: true,
            royaltyAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Compute Network Aggregates & KPIs
    const totalFranchiseesCount = franchisees.length;
    const activeFranchiseesCount = franchisees.filter(
      (f) => f.subscriptionStatus === SubscriptionStatus.ACTIVE
    ).length;

    let totalBookingsAcrossNetwork = 0;
    let totalGrossVolumeAcrossNetwork = 0;
    let totalRoyaltyEarned = 0;
    let totalRoyaltyPending = 0;
    let totalRoyaltySettled = 0;

    const formattedFranchisees = franchisees.map((f) => {
      const owner = f.users[0] || null;
      const bkgCount = f.eventBookings.length;
      let fGross = 0;
      let fPending = 0;
      let fSettled = 0;

      for (const r of f.franchiseeRoyalties) {
        const amt = Number(r.royaltyAmount || 0);
        fGross += Number(r.grossAmount || 0);
        if (r.status === RoyaltyStatus.PENDING) {
          fPending += amt;
        } else if (r.status === RoyaltyStatus.SETTLED) {
          fSettled += amt;
        }
      }

      totalBookingsAcrossNetwork += bkgCount;
      totalGrossVolumeAcrossNetwork += fGross;
      totalRoyaltyEarned += (fPending + fSettled);
      totalRoyaltyPending += fPending;
      totalRoyaltySettled += fSettled;

      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        city: f.city || '—',
        state: f.state || '—',
        royaltyPercent: Number(f.royaltyPercent || 0),
        subscriptionStatus: f.subscriptionStatus,
        createdAt: f.createdAt.toISOString(),
        ownerName: owner?.name || 'Studio Owner',
        ownerEmail: owner?.email || f.email || '—',
        ownerPhone: owner?.phone || f.phone || '—',
        totalBookings: bkgCount,
        totalGrossVolume: Math.round(fGross * 100) / 100,
        pendingRoyalty: Math.round(fPending * 100) / 100,
        settledRoyalty: Math.round(fSettled * 100) / 100,
      };
    });

    // 4. Flexi-Billing Calculations
    const allowFranchises = plan?.allowFranchises ?? true;
    const perFranchiseMonthlyPrice = Number(plan?.perFranchiseMonthlyPrice || 0);
    const perFranchiseAnnualPrice = Number(plan?.perFranchiseAnnualPrice || 0);
    const isAnnual = activeSub?.billingCycle === BillingCycle.ANNUAL;

    const baseMonthlyPrice = isAnnual
      ? Number(plan?.annualPrice || 0) / 12
      : Number(plan?.monthlyPrice || 0);

    const perFranchiseRate = isAnnual
      ? perFranchiseAnnualPrice / 12
      : perFranchiseMonthlyPrice;

    const currentFranchiseAddonMonthly = activeFranchiseesCount * perFranchiseRate;
    const totalEstimatedMonthlyBill = baseMonthlyPrice + currentFranchiseAddonMonthly;

    // 5. Query Recent Royalty Ledger Entries
    const recentLedger = await prisma.franchiseRoyaltyLedger.findMany({
      where: { franchisorId },
      include: {
        franchisee: {
          select: { id: true, name: true, slug: true },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            startDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formattedLedger = recentLedger.map((r) => ({
      id: r.id,
      bookingTitle: r.bookingTitle,
      bookingNumber: r.eventBooking?.bookingNumber || '—',
      eventDate: r.eventBooking?.startDate
        ? r.eventBooking.startDate.toISOString()
        : null,
      franchiseeId: r.franchiseeId,
      franchiseeName: r.franchisee.name,
      grossAmount: Number(r.grossAmount),
      royaltyPercent: Number(r.royaltyPercent),
      royaltyAmount: Number(r.royaltyAmount),
      status: r.status,
      settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      settlementRef: r.settlementRef,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        franchisor: {
          id: franchisor.id,
          name: franchisor.name,
          slug: franchisor.slug,
        },
        flexiBilling: {
          planName: plan?.name || 'Enterprise Multi-Franchise',
          allowFranchises,
          billingCycle: activeSub?.billingCycle || 'MONTHLY',
          baseMonthlyPrice: Math.round(baseMonthlyPrice * 100) / 100,
          perFranchiseRate: Math.round(perFranchiseRate * 100) / 100,
          activeFranchisesCount: activeFranchiseesCount,
          currentFranchiseAddonMonthly:
            Math.round(currentFranchiseAddonMonthly * 100) / 100,
          totalEstimatedMonthlyBill:
            Math.round(totalEstimatedMonthlyBill * 100) / 100,
        },
        kpis: {
          totalFranchiseesCount,
          activeFranchiseesCount,
          totalBookingsAcrossNetwork,
          totalGrossVolumeAcrossNetwork:
            Math.round(totalGrossVolumeAcrossNetwork * 100) / 100,
          totalRoyaltyEarned: Math.round(totalRoyaltyEarned * 100) / 100,
          totalRoyaltyPending: Math.round(totalRoyaltyPending * 100) / 100,
          totalRoyaltySettled: Math.round(totalRoyaltySettled * 100) / 100,
        },
        franchisees: formattedFranchisees,
        ledger: formattedLedger,
      },
    };
  } catch (error: any) {
    console.error('[getFranchisorDashboardAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to load franchisor dashboard data',
    };
  }
}

// ==========================================
// 2. CREATE FRANCHISEE TENANT ACTION
// ==========================================
export async function createFranchiseAction(input: CreateFranchiseInput) {
  try {
    const { franchisorId, franchisorName } = await requireFranchisorContext();
    const validated = createFranchiseSchema.parse(input);

    // 1. Verify that email is not already taken across users
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validated.ownerEmail,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error: `A user account with email "${validated.ownerEmail}" already exists. Please use a distinct owner email for the new franchise.`,
      };
    }

    // 2. Generate slug and secure temporary password
    const slug = await generateUniqueFranchiseSlug(validated.name);
    const randomHex = crypto.randomBytes(3).toString('hex');
    const temporaryPassword = `Studio@${randomHex}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 3. Atomically provision Tenant, HQ Branch, Owner User, and UserBranch
    const result = await prisma.$transaction(async (tx) => {
      // Create child tenant
      const childTenant = await tx.tenant.create({
        data: {
          name: validated.name.trim(),
          slug,
          parentTenantId: franchisorId,
          isFranchisor: false,
          royaltyPercent: validated.royaltyPercent,
          subscriptionStatus: SubscriptionStatus.ACTIVE, // Inherits active software status from parent franchisor
          email: validated.ownerEmail,
          phone: validated.ownerPhone,
          contactPhone: validated.ownerPhone,
          city: validated.city.trim(),
          state: validated.state.trim(),
          address: validated.address?.trim() || null,
        },
      });

      // Create primary Branch for this franchise
      const branch = await tx.branch.create({
        data: {
          tenantId: childTenant.id,
          name: `${validated.city.trim()} Main Branch`,
          code: 'HQ',
          isHeadOffice: true,
          isActive: true,
          city: validated.city.trim(),
          state: validated.state.trim(),
          address: validated.address?.trim() || null,
        },
      });

      // Create Primary Owner User
      const user = await tx.user.create({
        data: {
          tenantId: childTenant.id,
          name: validated.ownerName.trim(),
          email: validated.ownerEmail,
          phone: validated.ownerPhone,
          passwordHash: hashedPassword,
          role: 'TENANT_OWNER',
          status: 'ACTIVE',
          canLogin: true,
        },
      });

      // Map User to Branch
      await tx.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
          isActive: true,
        },
      });

      return {
        tenant: childTenant,
        branch,
        user,
      };
    });

    revalidatePath('/franchise');
    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Franchise studio "${result.tenant.name}" successfully created!`,
      data: {
        franchiseId: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        city: result.tenant.city,
        state: result.tenant.state,
        ownerEmail: result.user.email,
        temporaryPassword,
      },
    };
  } catch (error: any) {
    console.error('[createFranchiseAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create franchise studio',
    };
  }
}

// ==========================================
// 3. TRANSFER LEAD TO FRANCHISEE ACTION
// ==========================================
export async function transferLeadToFranchiseAction(input: {
  leadId: string;
  targetFranchiseeId: string;
  notes?: string | null;
}) {
  try {
    const { franchisorId, franchisorName } = await requireFranchisorContext();
    const validated = transferLeadSchema.parse(input);

    // 1. Verify target franchisee belongs to this franchisor
    const targetFranchisee = await prisma.tenant.findUnique({
      where: { id: validated.targetFranchiseeId },
      select: {
        id: true,
        name: true,
        parentTenantId: true,
        branches: {
          where: { deletedAt: null, isActive: true },
          select: { id: true, isHeadOffice: true },
          take: 5,
        },
      },
    });

    if (!targetFranchisee || targetFranchisee.parentTenantId !== franchisorId) {
      return {
        success: false,
        error: 'Target studio is not a recognized franchisee of your network.',
      };
    }

    const targetBranch =
      targetFranchisee.branches.find((b) => b.isHeadOffice) ||
      targetFranchisee.branches[0];

    if (!targetBranch) {
      return {
        success: false,
        error: `Target franchisee "${targetFranchisee.name}" has no active operational branches.`,
      };
    }

    // 2. Fetch original lead and its customer
    const lead = await prisma.lead.findUnique({
      where: { id: validated.leadId },
      include: {
        customer: true,
      },
    });

    if (!lead || lead.tenantId !== franchisorId) {
      return {
        success: false,
        error: 'Lead not found in your master franchisor workspace.',
      };
    }

    // 3. Atomic lead transfer transaction
    const transferResult = await prisma.$transaction(async (tx) => {
      // Check if customer already exists in target franchisee
      let targetCustomerId: string;

      const existingCustomer = await tx.customer.findFirst({
        where: {
          tenantId: targetFranchisee.id,
          deletedAt: null,
          OR: [
            ...(lead.customer.phone ? [{ phone: lead.customer.phone }] : []),
            ...(lead.customer.email ? [{ email: lead.customer.email }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingCustomer) {
        targetCustomerId = existingCustomer.id;
      } else {
        const customerCode = await NumberSeriesService.getNextNumber(
          tx,
          targetFranchisee.id,
          'CUSTOMER'
        );

        const newCustomer = await tx.customer.create({
          data: {
            tenantId: targetFranchisee.id,
            branchId: targetBranch.id,
            customerCode,
            firstName: lead.customer.firstName,
            lastName: lead.customer.lastName,
            email: lead.customer.email,
            phone: lead.customer.phone,
            whatsapp: lead.customer.whatsapp,
            cityId: lead.customer.cityId,
            stateId: lead.customer.stateId,
          },
        });
        targetCustomerId = newCustomer.id;
      }

      // Generate next lead code in target franchisee
      const leadCode = await NumberSeriesService.getNextNumber(
        tx,
        targetFranchisee.id,
        'LEAD'
      );

      const transferredLeadNotes = [
        `[Transferred from Master Franchisor: ${franchisorName}]`,
        validated.notes ? `Franchisor Note: ${validated.notes}` : null,
        lead.notes ? `Original Lead Notes: ${lead.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      const clonedLead = await tx.lead.create({
        data: {
          tenantId: targetFranchisee.id,
          branchId: targetBranch.id,
          customerId: targetCustomerId,
          leadCode,
          packageId: lead.packageId,
          expectedRevenue: lead.expectedRevenue,
          expectedBookingDate: lead.expectedBookingDate,
          status: 'NEW',
          notes: transferredLeadNotes,
        },
      });

      // Update original master lead to mark as transferred
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          notes: `${lead.notes || ''}\n[Transferred to Franchisee: ${targetFranchisee.name} (${clonedLead.leadCode}) on ${new Date().toLocaleDateString('en-IN')}]`,
        },
      });

      return {
        clonedLeadId: clonedLead.id,
        leadCode: clonedLead.leadCode,
        targetFranchiseeName: targetFranchisee.name,
      };
    });

    revalidatePath('/leads');
    revalidatePath('/franchise');

    return {
      success: true,
      message: `Lead successfully transferred to "${transferResult.targetFranchiseeName}" as ${transferResult.leadCode}!`,
      data: transferResult,
    };
  } catch (error: any) {
    console.error('[transferLeadToFranchiseAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to transfer lead to franchise',
    };
  }
}

// ==========================================
// 4. MARK ROYALTY SETTLED ACTION
// ==========================================
export async function markRoyaltySettledAction(input: {
  ledgerId: string;
  settlementRef: string;
  notes?: string | null;
}) {
  try {
    const { franchisorId } = await requireFranchisorContext();
    const validated = settleRoyaltySchema.parse(input);

    const ledger = await prisma.franchiseRoyaltyLedger.findUnique({
      where: { id: validated.ledgerId },
      select: {
        id: true,
        franchisorId: true,
        status: true,
        royaltyAmount: true,
        bookingTitle: true,
      },
    });

    if (!ledger || ledger.franchisorId !== franchisorId) {
      return {
        success: false,
        error: 'Royalty ledger entry not found in your network account.',
      };
    }

    if (ledger.status === RoyaltyStatus.SETTLED) {
      return {
        success: false,
        error: 'This royalty entry has already been marked as settled.',
      };
    }

    const updated = await prisma.franchiseRoyaltyLedger.update({
      where: { id: validated.ledgerId },
      data: {
        status: RoyaltyStatus.SETTLED,
        settledAt: new Date(),
        settlementRef: validated.settlementRef.trim(),
        notes: validated.notes
          ? `${ledger.bookingTitle} — ${validated.notes}`
          : undefined,
      },
    });

    revalidatePath('/franchise');

    return {
      success: true,
      message: `Royalty of ₹${Number(updated.royaltyAmount).toLocaleString('en-IN')} marked as SETTLED.`,
      data: {
        id: updated.id,
        settledAt: updated.settledAt,
        settlementRef: updated.settlementRef,
      },
    };
  } catch (error: any) {
    console.error('[markRoyaltySettledAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to record royalty settlement',
    };
  }
}

// ==========================================
// 5. SYNC MISSING ROYALTIES ACTION
// ==========================================
export async function syncMissingFranchiseRoyaltiesAction(franchiseeId?: string) {
  try {
    const { franchisorId } = await requireFranchisorContext();

    const result = await FranchiseRoyaltyService.syncMissingFranchiseRoyalties({
      franchisorId,
      franchiseeId,
    });

    revalidatePath('/franchise');

    return {
      success: true,
      message: `Synced ${result.totalSynced} missing franchise royalties (${result.errors} errors).`,
      data: result,
    };
  } catch (error: any) {
    console.error('[syncMissingFranchiseRoyaltiesAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync missing royalties',
    };
  }
}
