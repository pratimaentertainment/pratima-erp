'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
  createDealerSchema,
  updateDealerSchema,
  recordDealerPayoutSchema,
  type CreateDealerInput,
  type UpdateDealerInput,
  type RecordDealerPayoutInput,
} from '@/schemas/dealer.schema';

/**
 * Strict Security Guard: Enforces that the caller is an authenticated SUPER_ADMIN.
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
 * Admin-Only Dealer Provisioning:
 * Creates a User account (role: DEALER, tenantId: null) and DealerProfile atomically.
 */
export async function createDealerAction(input: CreateDealerInput) {
  try {
    await requireSuperAdmin();
    const validated = createDealerSchema.parse(input);

    const normalizedCode = validated.dealerCode.trim().toUpperCase();
    const normalizedEmail = validated.email.trim().toLowerCase();

    // Check if dealer code already exists
    const existingDealer = await prisma.dealerProfile.findUnique({
      where: { dealerCode: normalizedCode },
    });

    if (existingDealer) {
      return {
        success: false,
        error: `Dealer code "${normalizedCode}" is already taken. Please choose another code.`,
      };
    }

    // Check if user email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: `An account with email "${normalizedEmail}" already exists.`,
      };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User with DEALER role and no tenantId
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: validated.contactPerson.trim(),
          passwordHash: hashedPassword,
          role: Role.DEALER,
          tenantId: null,
          phone: validated.phone.trim(),
          status: 'ACTIVE',
          isActive: true,
          canLogin: true,
        },
      });

      // 2. Create Dealer Profile
      const dealer = await tx.dealerProfile.create({
        data: {
          userId: user.id,
          dealerCode: normalizedCode,
          businessName: validated.businessName.trim(),
          contactPerson: validated.contactPerson.trim(),
          phone: validated.phone.trim(),
          city: validated.city?.trim() || null,
          commissionPercent: new Prisma.Decimal(validated.commissionPercent),
          firstPaymentDiscountPercent: new Prisma.Decimal(validated.firstPaymentDiscountPercent),
          bankDetails: validated.bankDetails?.trim() || null,
          isActive: true,
        },
      });

      return { user, dealer };
    });

    revalidatePath('/super-admin/dealers');

    return {
      success: true,
      message: `Dealer "${result.dealer.businessName}" (${result.dealer.dealerCode}) created successfully.`,
      data: {
        dealerId: result.dealer.id,
        dealerCode: result.dealer.dealerCode,
        userId: result.user.id,
      },
    };
  } catch (error: any) {
    console.error('[createDealerAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create dealer profile.',
    };
  }
}

/**
 * Super Admin: Update Dealer Rates & Details
 */
export async function updateDealerAction(input: UpdateDealerInput) {
  try {
    await requireSuperAdmin();
    const validated = updateDealerSchema.parse(input);

    const updated = await prisma.dealerProfile.update({
      where: { id: validated.dealerId },
      data: {
        businessName: validated.businessName.trim(),
        contactPerson: validated.contactPerson.trim(),
        phone: validated.phone.trim(),
        city: validated.city?.trim() || null,
        commissionPercent: new Prisma.Decimal(validated.commissionPercent),
        firstPaymentDiscountPercent: new Prisma.Decimal(validated.firstPaymentDiscountPercent),
        bankDetails: validated.bankDetails?.trim() || null,
        isActive: validated.isActive,
      },
    });

    revalidatePath('/super-admin/dealers');

    return {
      success: true,
      message: `Dealer "${updated.businessName}" updated successfully.`,
      data: updated,
    };
  } catch (error: any) {
    console.error('[updateDealerAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update dealer.',
    };
  }
}

/**
 * Super Admin: Toggle Dealer Active / Suspended Status
 */
export async function toggleDealerStatusAction(dealerId: string, isActive: boolean) {
  try {
    await requireSuperAdmin();

    const dealer = await prisma.dealerProfile.update({
      where: { id: dealerId },
      data: { isActive },
    });

    // Also sync the user account
    await prisma.user.update({
      where: { id: dealer.userId },
      data: { isActive, canLogin: isActive },
    });

    revalidatePath('/super-admin/dealers');

    return {
      success: true,
      message: `Dealer "${dealer.businessName}" has been ${isActive ? 'activated' : 'suspended'}.`,
    };
  } catch (error: any) {
    console.error('[toggleDealerStatusAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to toggle dealer status.',
    };
  }
}

/**
 * Super Admin: Record a Dealer Payout
 * Creates a DealerPayout record and marks oldest PENDING commissions as PAID up to the payout amount.
 */
export async function recordDealerPayoutAction(input: RecordDealerPayoutInput) {
  try {
    await requireSuperAdmin();
    const validated = recordDealerPayoutSchema.parse(input);

    const dealer = await prisma.dealerProfile.findUnique({
      where: { id: validated.dealerId },
    });

    if (!dealer) {
      return { success: false, error: 'Dealer not found.' };
    }

    const payoutAmount = validated.amount;

    // Anti-Fraud & Ledger Integrity Guard: Verify payout does not exceed verified pending commission
    const pendingCommissions = await prisma.dealerCommissionLedger.findMany({
      where: {
        dealerId: dealer.id,
        status: 'PENDING',
      },
      select: { id: true, commissionAmount: true },
    });

    const totalPendingCommission = pendingCommissions.reduce(
      (sum, c) => sum + Number(c.commissionAmount),
      0
    );

    if (totalPendingCommission <= 0) {
      return {
        success: false,
        error: `Dealer "${dealer.businessName}" has zero pending commission balance (₹0.00).`,
      };
    }

    if (payoutAmount > totalPendingCommission) {
      return {
        success: false,
        error: `Payout amount (₹${payoutAmount.toLocaleString('en-IN')}) exceeds total pending commission balance of ₹${totalPendingCommission.toLocaleString('en-IN')}.`,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create DealerPayout record
      const payout = await tx.dealerPayout.create({
        data: {
          dealerId: dealer.id,
          amount: new Prisma.Decimal(payoutAmount),
          paymentMode: validated.paymentMode,
          transactionRef: validated.transactionRef.trim(),
          notes: validated.notes?.trim() || null,
          paidAt: new Date(),
        },
      });

      // 2. Settle pending commissions up to the payout amount
      const pendingCommissions = await tx.dealerCommissionLedger.findMany({
        where: {
          dealerId: dealer.id,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
      });

      let remainingToSettle = payoutAmount;
      const settledCommissionIds: string[] = [];

      for (const comm of pendingCommissions) {
        if (remainingToSettle <= 0) break;
        const commAmt = Number(comm.commissionAmount);

        // Mark as PAID and link to payoutId
        await tx.dealerCommissionLedger.update({
          where: { id: comm.id },
          data: {
            status: 'PAID',
            payoutId: payout.id,
          },
        });

        settledCommissionIds.push(comm.id);
        remainingToSettle -= commAmt;
      }

      return { payout, settledCount: settledCommissionIds.length };
    });

    revalidatePath('/super-admin/dealers');

    return {
      success: true,
      message: `Payout of ₹${payoutAmount.toLocaleString('en-IN')} recorded for "${dealer.businessName}". Settled ${result.settledCount} commission entries.`,
      data: {
        payoutId: result.payout.id,
        settledCount: result.settledCount,
      },
    };
  } catch (error: any) {
    console.error('[recordDealerPayoutAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to record dealer payout.',
    };
  }
}

/**
 * Super Admin: Get detailed commission ledger and payout history for a dealer
 */
export async function getDealerLedgerAction(dealerId: string) {
  try {
    await requireSuperAdmin();

    const [dealer, commissions, payouts, referredTenants] = await Promise.all([
      prisma.dealerProfile.findUnique({
        where: { id: dealerId },
        include: { user: { select: { email: true } } },
      }),
      prisma.dealerCommissionLedger.findMany({
        where: { dealerId },
        include: {
          tenant: { select: { name: true, slug: true, city: true } },
          billingTransaction: { select: { paymentMode: true, transactionDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dealerPayout.findMany({
        where: { dealerId },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.tenant.findMany({
        where: { referredByDealerId: dealerId },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          subscriptionStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!dealer) {
      return { success: false, error: 'Dealer not found.' };
    }

    return {
      success: true,
      data: {
        dealer: {
          id: dealer.id,
          dealerCode: dealer.dealerCode,
          businessName: dealer.businessName,
          contactPerson: dealer.contactPerson,
          email: dealer.user.email,
          phone: dealer.phone,
          city: dealer.city,
          commissionPercent: Number(dealer.commissionPercent),
          firstPaymentDiscountPercent: Number(dealer.firstPaymentDiscountPercent),
          bankDetails: dealer.bankDetails,
          isActive: dealer.isActive,
          createdAt: dealer.createdAt.toISOString(),
        },
        referredTenants: referredTenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          city: t.city || 'N/A',
          status: t.subscriptionStatus,
          joinedAt: t.createdAt.toISOString(),
        })),
        commissions: commissions.map((c) => ({
          id: c.id,
          tenantName: c.tenant.name,
          paymentCycleNumber: c.paymentCycleNumber,
          netPaidAmount: Number(c.netPaidAmount),
          commissionPercent: Number(c.commissionPercent),
          commissionAmount: Number(c.commissionAmount),
          status: c.status,
          date: c.createdAt.toISOString(),
        })),
        payouts: payouts.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMode: p.paymentMode,
          transactionRef: p.transactionRef,
          notes: p.notes,
          paidAt: p.paidAt.toISOString(),
        })),
      },
    };
  } catch (error: any) {
    console.error('[getDealerLedgerAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch dealer ledger.',
    };
  }
}

/**
 * Super Admin: Get all dealers with performance stats and platform-wide dealer aggregates
 */
export async function getSuperAdminDealersAction() {
  try {
    await requireSuperAdmin();

    const dealers = await prisma.dealerProfile.findMany({
      include: {
        user: { select: { email: true, isActive: true } },
        _count: { select: { referredTenants: true } },
        commissions: { select: { commissionAmount: true, status: true } },
        payouts: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalLifetimeCommissions = 0;
    let totalPendingPayout = 0;
    let totalPaidOut = 0;
    let totalReferredStudios = 0;

    const formattedDealers = dealers.map((dealer) => {
      let lifetimeEarned = 0;
      let pendingPayout = 0;

      for (const c of dealer.commissions) {
        const amt = Number(c.commissionAmount);
        lifetimeEarned += amt;
        if (c.status === 'PENDING') {
          pendingPayout += amt;
        }
      }

      let totalPaid = 0;
      for (const p of dealer.payouts) {
        totalPaid += Number(p.amount);
      }

      totalLifetimeCommissions += lifetimeEarned;
      totalPendingPayout += pendingPayout;
      totalPaidOut += totalPaid;
      totalReferredStudios += dealer._count.referredTenants;

      return {
        id: dealer.id,
        dealerCode: dealer.dealerCode,
        businessName: dealer.businessName,
        contactPerson: dealer.contactPerson,
        email: dealer.user.email,
        phone: dealer.phone,
        city: dealer.city || 'N/A',
        commissionPercent: Number(dealer.commissionPercent),
        firstPaymentDiscountPercent: Number(dealer.firstPaymentDiscountPercent),
        bankDetails: dealer.bankDetails || '',
        isActive: dealer.isActive,
        createdAt: dealer.createdAt.toISOString(),
        referredCount: dealer._count.referredTenants,
        lifetimeEarned,
        pendingPayout,
        totalPaid,
      };
    });

    return {
      success: true,
      data: {
        dealers: formattedDealers,
        metrics: {
          totalDealers: dealers.length,
          activeDealers: dealers.filter((d) => d.isActive).length,
          totalReferredStudios,
          totalLifetimeCommissions,
          totalPendingPayout,
          totalPaidOut,
        },
      },
    };
  } catch (error: any) {
    console.error('[getSuperAdminDealersAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch dealers.',
      data: {
        dealers: [],
        metrics: {
          totalDealers: 0,
          activeDealers: 0,
          totalReferredStudios: 0,
          totalLifetimeCommissions: 0,
          totalPendingPayout: 0,
          totalPaidOut: 0,
        },
      },
    };
  }
}
