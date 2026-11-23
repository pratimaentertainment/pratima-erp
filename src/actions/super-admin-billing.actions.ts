'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { Prisma, PaymentStatus, BillingCycle, SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

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

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const recordOfflinePaymentSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  planId: z.string().min(1, 'Please select a subscription plan'),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
  amount: z.number().min(0, 'Amount must be non-negative'),
  paymentMode: z.enum(['UPI', 'NEFT', 'CASH', 'CHEQUE']),
  transactionRef: z.string().min(1, 'Transaction reference / UTR / Cheque number is required'),
  notes: z.string().optional().nullable(),
});

// ==========================================
// 1. REVENUE & KPI ANALYTICS
// ==========================================

/**
 * Computes platform-wide SaaS financial metrics: Total Revenue, MRR, ARR,
 * Active Paid Studios, and Trial-to-Paid Conversion rate.
 */
export async function getSaasRevenueAnalyticsAction() {
  try {
    await requireSuperAdmin();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    // 1. Query all SUCCESS transactions
    const successfulTransactions = await prisma.billingTransaction.findMany({
      where: { status: PaymentStatus.SUCCESS },
      select: {
        amount: true,
        transactionDate: true,
      },
    });

    let totalCollectedRevenue = 0;
    let currentMonthRevenue = 0;

    for (const tx of successfulTransactions) {
      const amt = Number(tx.amount || 0);
      totalCollectedRevenue += amt;
      if (new Date(tx.transactionDate) >= startOfMonth) {
        currentMonthRevenue += amt;
      }
    }

    // 2. Fetch all active Tenant Subscriptions to calculate MRR & ARR
    const activeSubscriptions = await prisma.tenantSubscription.findMany({
      where: {
        tenant: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
        OR: [
          { endDate: null }, // lifetime / infinite
          { endDate: { gte: now } }, // active valid period
        ],
      },
      include: {
        plan: true,
        tenant: {
          select: {
            id: true,
            isFranchisor: true,
            franchisees: {
              where: {
                subscriptionStatus: SubscriptionStatus.ACTIVE,
                deletedAt: null,
              },
              select: { id: true },
            },
          },
        },
      },
    });

    let estimatedMrr = 0;
    for (const sub of activeSubscriptions) {
      const plan = sub.plan;
      if (!plan) continue;

      let baseMonthly = 0;
      if (sub.billingCycle === BillingCycle.ANNUAL) {
        baseMonthly = Number(plan.annualPrice) / 12;
      } else {
        baseMonthly = Number(plan.monthlyPrice);
      }

      // Flexi-Billing Franchise Scale Calculation: Base Plan + (Active Franchises × Per-Franchise Rate)
      let franchiseAddonMonthly = 0;
      if (plan.allowFranchises && sub.tenant?.isFranchisor && sub.tenant?.franchisees?.length > 0) {
        const activeCount = sub.tenant.franchisees.length;
        if (sub.billingCycle === BillingCycle.ANNUAL) {
          franchiseAddonMonthly = (activeCount * Number(plan.perFranchiseAnnualPrice || 0)) / 12;
        } else {
          franchiseAddonMonthly = activeCount * Number(plan.perFranchiseMonthlyPrice || 0);
        }
      }

      estimatedMrr += (baseMonthly + franchiseAddonMonthly);
    }

    const estimatedArr = estimatedMrr * 12;

    // 3. Count total vs paid studios for conversion analytics
    const [totalTenantsCount, activePaidTenantsCount, trialTenantsCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({
        where: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      }),
      prisma.tenant.count({
        where: {
          subscriptionStatus: SubscriptionStatus.TRIAL,
        },
      }),
    ]);

    const conversionRate = totalTenantsCount > 0
      ? Math.round((activePaidTenantsCount / totalTenantsCount) * 1000) / 10
      : 0;

    return {
      success: true,
      data: {
        totalCollectedRevenue: Math.round(totalCollectedRevenue * 100) / 100,
        currentMonthRevenue: Math.round(currentMonthRevenue * 100) / 100,
        estimatedMrr: Math.round(estimatedMrr * 100) / 100,
        estimatedArr: Math.round(estimatedArr * 100) / 100,
        activePaidTenantsCount,
        trialTenantsCount,
        totalTenantsCount,
        conversionRate,
      },
    };
  } catch (error: any) {
    console.error('[getSaasRevenueAnalyticsAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to compute revenue analytics',
    };
  }
}

// ==========================================
// 2. TRANSACTIONS LEDGER
// ==========================================

/**
 * Fetches the searchable, paginated Billing Transactions Ledger.
 */
export async function getBillingTransactionsLedgerAction(filters?: {
  search?: string;
  status?: string;
  paymentMode?: string;
}) {
  try {
    await requireSuperAdmin();

    const whereClause: Prisma.BillingTransactionWhereInput = {};

    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status as PaymentStatus;
    }

    if (filters?.paymentMode && filters.paymentMode !== 'ALL') {
      whereClause.paymentMode = filters.paymentMode;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      whereClause.OR = [
        { tenant: { name: { contains: q, mode: 'insensitive' } } },
        { tenant: { slug: { contains: q, mode: 'insensitive' } } },
        { transactionRef: { contains: q, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
        { razorpayOrderId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const transactions = await prisma.billingTransaction.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactPhone: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            slug: true,
            monthlyPrice: true,
            annualPrice: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      paymentMode: t.paymentMode || 'RAZORPAY',
      transactionRef: t.transactionRef || t.razorpayPaymentId || t.razorpayOrderId || null,
      notes: t.notes,
      transactionDate: t.transactionDate.toISOString(),
      receiptUrl: t.receiptUrl,
      tenantId: t.tenantId,
      studioName: t.tenant?.name || 'Unknown Studio',
      studioSlug: t.tenant?.slug || '',
      studioPhone: t.tenant?.contactPhone || '',
      planName: t.plan?.name || 'Standard Tier',
    }));

    return {
      success: true,
      data: serializePrisma(formatted),
    };
  } catch (error: any) {
    console.error('[getBillingTransactionsLedgerAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch billing transactions ledger',
      data: [],
    };
  }
}

// ==========================================
// 3. OFFLINE PAYMENT RECORDING ENGINE
// ==========================================

/**
 * Fetches tenant and plan metadata to populate the offline payment form.
 */
export async function getOfflineBillingMetadataAction() {
  try {
    await requireSuperAdmin();

    const [tenants, plans] = await Promise.all([
      prisma.tenant.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          contactPhone: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          subscription: {
            select: {
              planId: true,
              billingCycle: true,
              endDate: true,
            },
          },
        },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          monthlyPrice: true,
          annualPrice: true,
          maxBranches: true,
          maxStaff: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        tenants: serializePrisma(tenants),
        plans: serializePrisma(
          plans.map((p) => ({
            ...p,
            monthlyPrice: Number(p.monthlyPrice),
            annualPrice: Number(p.annualPrice),
          }))
        ),
      },
    };
  } catch (error: any) {
    console.error('[getOfflineBillingMetadataAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch billing metadata',
      data: { tenants: [], plans: [] },
    };
  }
}

/**
 * Records a manual/offline payment (NEFT, UPI, Cash, Cheque) for a studio tenant.
 * Atomically creates a BillingTransaction, upserts TenantSubscription with carry-forward validity,
 * updates Tenant subscriptionStatus to ACTIVE, and lifts any Hard Lock.
 */
export async function recordOfflinePaymentAction(input: z.infer<typeof recordOfflinePaymentSchema>) {
  try {
    await requireSuperAdmin();
    const validated = recordOfflinePaymentSchema.parse(input);

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      return { success: false, error: 'Studio tenant not found.' };
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: validated.planId },
    });

    if (!plan) {
      return { success: false, error: 'Subscription plan not found.' };
    }

    const durationDays = validated.billingCycle === 'ANNUAL' ? 365 : 30;
    const now = new Date();

    // Carry-forward logic: if current subscription endDate is in future, extend from that timestamp!
    const baseDate = tenant.subscription?.endDate && new Date(tenant.subscription.endDate) > now
      ? new Date(tenant.subscription.endDate)
      : now;

    const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Atomic transaction for financial integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create SUCCESS BillingTransaction record
      const billingTx = await tx.billingTransaction.create({
        data: {
          tenantId: validated.tenantId,
          planId: validated.planId,
          amount: new Prisma.Decimal(validated.amount),
          currency: 'INR',
          status: PaymentStatus.SUCCESS,
          paymentMode: validated.paymentMode,
          transactionRef: validated.transactionRef.trim(),
          notes: validated.notes?.trim() || `Offline ${validated.paymentMode} Payment recorded by Super Admin`,
          transactionDate: now,
        },
      });

      // 2. Upsert TenantSubscription with plan and calculated end date
      const sub = await tx.tenantSubscription.upsert({
        where: { tenantId: validated.tenantId },
        update: {
          planId: validated.planId,
          billingCycle: validated.billingCycle as BillingCycle,
          startDate: now,
          endDate: newEndDate,
        },
        create: {
          tenantId: validated.tenantId,
          planId: validated.planId,
          billingCycle: validated.billingCycle as BillingCycle,
          startDate: now,
          endDate: newEndDate,
        },
      });

      // 3. Activate Tenant subscription status and clear trial lock
      const updatedTenant = await tx.tenant.update({
        where: { id: validated.tenantId },
        data: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
        },
      });

      return { billingTx, sub, updatedTenant };
    });

    revalidatePath('/super-admin/revenue');
    revalidatePath('/super-admin');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Offline payment of ₹${validated.amount.toLocaleString('en-IN')} recorded for "${tenant.name}". Subscription active until ${newEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      data: {
        transactionId: result.billingTx.id,
        newEndDate: newEndDate.toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[recordOfflinePaymentAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to record offline payment.',
    };
  }
}
