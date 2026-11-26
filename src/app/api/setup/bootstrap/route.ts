import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import {
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
  DEFAULT_PACKAGING_PLANS,
} from '@/lib/constants/plan-features';
import { ensureAddonPriceListInitialized } from '@/actions/subscription.actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SubscriptionPlanSeedData {
  slug: string;
  name: string;
  originalMonthlyPrice?: number;
  monthlyPrice: number;
  originalAnnualPrice?: number;
  annualPrice: number;
  offerBadgeText?: string;
  isBasePlan: boolean;
  sortOrder: number;
  maxBranches: number;
  maxStaff: number;
  smsCredits: number;
  whatsappCredits: number;
  allowFranchises: boolean;
  perFranchiseMonthlyPrice: number;
  perFranchiseAnnualPrice: number;
  isActive: boolean;
  features: string[];
}

const DEFAULT_PLANS = DEFAULT_PACKAGING_PLANS;

/**
 * GET /api/setup/bootstrap?secret=...
 *
 * Secure, idempotent, production bootstrap endpoint to provision:
 * 1. Global Super Admin account (suhaswagire.photo@gmail.com)
 * 2. Default tiered Subscription Plans (Starter Studio as Base Plan, Pro Studio, Enterprise Franchise)
 * 3. Default Modular Add-on Capabilities Price Catalog
 *
 * Protected via query param `secret` matching SETUP_SECRET, NEXTAUTH_SECRET, AUTH_SECRET, or JWT_SECRET.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providedSecret = searchParams.get('secret');
    const configuredSecret =
      process.env.SETUP_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.JWT_SECRET;

    if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing setup secret.',
        },
        { status: 401 }
      );
    }

    // 1. Upsert Super Admin Account
    const superAdminEmail = 'suhaswagire.photo@gmail.com'.trim().toLowerCase();
    const superAdminPassword = 'Pratima@2026';
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        email: { equals: superAdminEmail, mode: 'insensitive' },
      },
    });

    let superAdminUser;
    if (existingSuperAdmin) {
      superAdminUser = await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: {
          name: 'Suhas Wagire',
          passwordHash: hashedPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
          status: 'ACTIVE',
          isActive: true,
          canLogin: true,
          isLocked: false,
          lockUntil: null,
          failedLoginAttempts: 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isActive: true,
          canLogin: true,
          tenantId: true,
          updatedAt: true,
        },
      });
    } else {
      superAdminUser = await prisma.user.create({
        data: {
          email: superAdminEmail,
          name: 'Suhas Wagire',
          passwordHash: hashedPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
          status: 'ACTIVE',
          isActive: true,
          canLogin: true,
          isLocked: false,
          failedLoginAttempts: 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isActive: true,
          canLogin: true,
          tenantId: true,
          createdAt: true,
        },
      });
    }

    // 2. Upsert Subscription Plans with MRP, Base Plan & Badges
    const seededPlans = [];
    for (const plan of DEFAULT_PLANS) {
      const upsertedPlan = await prisma.subscriptionPlan.upsert({
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
          smsCredits: plan.smsCredits ?? 0,
          whatsappCredits: plan.whatsappCredits ?? 0,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled ?? plan.allowFranchises,
          includedAddons: plan.includedAddons ?? [],
          perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice ?? 0,
          perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice ?? 0,
          isActive: plan.isActive ?? true,
          features: plan.features,
        },
        create: {
          name: plan.name,
          slug: plan.slug,
          originalMonthlyPrice: plan.originalMonthlyPrice,
          monthlyPrice: plan.monthlyPrice,
          originalAnnualPrice: plan.originalAnnualPrice,
          annualPrice: plan.annualPrice,
          offerBadgeText: plan.offerBadgeText,
          isBasePlan: plan.isBasePlan,
          sortOrder: plan.sortOrder,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          smsCredits: plan.smsCredits ?? 0,
          whatsappCredits: plan.whatsappCredits ?? 0,
          allowFranchises: plan.allowFranchises,
          franchiseEnabled: plan.franchiseEnabled ?? plan.allowFranchises,
          includedAddons: plan.includedAddons ?? [],
          perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice ?? 0,
          perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice ?? 0,
          isActive: plan.isActive ?? true,
          features: plan.features,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          originalMonthlyPrice: true,
          monthlyPrice: true,
          originalAnnualPrice: true,
          annualPrice: true,
          offerBadgeText: true,
          isBasePlan: true,
          sortOrder: true,
          maxBranches: true,
          maxStaff: true,
          allowFranchises: true,
          features: true,
          isActive: true,
        },
      });
      seededPlans.push(upsertedPlan);
    }

    // Ensure cost-recovery & scale add-ons are initialized
    await ensureAddonPriceListInitialized();

    // 3. Ensure Modular Add-on Capabilities Price Catalog is Initialized
    await ensureAddonPriceListInitialized();

    const seededAddons = await prisma.planAddonConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: 'Production bootstrap executed successfully.',
      superAdmin: {
        id: superAdminUser.id,
        email: superAdminUser.email,
        name: superAdminUser.name,
        role: superAdminUser.role,
        status: superAdminUser.status,
        isActive: superAdminUser.isActive,
        canLogin: superAdminUser.canLogin,
      },
      plansCount: seededPlans.length,
      plans: seededPlans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        originalMonthlyPrice: p.originalMonthlyPrice ? Number(p.originalMonthlyPrice) : null,
        monthlyPrice: Number(p.monthlyPrice),
        originalAnnualPrice: p.originalAnnualPrice ? Number(p.originalAnnualPrice) : null,
        annualPrice: Number(p.annualPrice),
        offerBadgeText: p.offerBadgeText,
        isBasePlan: p.isBasePlan,
        sortOrder: p.sortOrder,
        maxBranches: p.maxBranches,
        maxStaff: p.maxStaff,
        allowFranchises: p.allowFranchises,
        features: p.features,
        isActive: p.isActive,
      })),
      addonsCount: seededAddons.length,
      addons: seededAddons.map((a) => ({
        featureKey: a.featureKey,
        name: a.name,
        monthlyPrice: Number(a.monthlyPrice),
        annualPrice: Number(a.annualPrice),
        isActive: a.isActive,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PRODUCTION_BOOTSTRAP_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Bootstrap execution failed.',
        details: error?.message || 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
