import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SubscriptionPlanSeedData {
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxBranches: number;
  maxStaff: number;
  smsCredits: number;
  whatsappCredits: number;
  allowFranchises: boolean;
  perFranchiseMonthlyPrice: number;
  perFranchiseAnnualPrice: number;
  isActive: boolean;
}

const DEFAULT_PLANS: SubscriptionPlanSeedData[] = [
  {
    slug: 'starter-studio',
    name: 'Starter Studio',
    monthlyPrice: 999,
    annualPrice: 9990,
    maxBranches: 1,
    maxStaff: 3,
    smsCredits: 100,
    whatsappCredits: 500,
    allowFranchises: false,
    perFranchiseMonthlyPrice: 0,
    perFranchiseAnnualPrice: 0,
    isActive: true,
  },
  {
    slug: 'pro-studio',
    name: 'Pro Studio',
    monthlyPrice: 2499,
    annualPrice: 24990,
    maxBranches: 3,
    maxStaff: 10,
    smsCredits: 500,
    whatsappCredits: 2500,
    allowFranchises: false,
    perFranchiseMonthlyPrice: 0,
    perFranchiseAnnualPrice: 0,
    isActive: true,
  },
  {
    slug: 'enterprise-franchise',
    name: 'Enterprise Franchise',
    monthlyPrice: 4999,
    annualPrice: 49990,
    maxBranches: 10,
    maxStaff: 50,
    smsCredits: 2000,
    whatsappCredits: 10000,
    allowFranchises: true,
    perFranchiseMonthlyPrice: 999,
    perFranchiseAnnualPrice: 9990,
    isActive: true,
  },
];

/**
 * GET /api/setup/bootstrap?secret=...
 *
 * Secure, idempotent, production bootstrap endpoint to provision:
 * 1. Global Super Admin account (suhaswagire.photo@gmail.com)
 * 2. Default tiered Subscription Plans (Starter Studio, Pro Studio, Enterprise Franchise)
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

    // 2. Upsert Subscription Plans
    const seededPlans = [];
    for (const plan of DEFAULT_PLANS) {
      const upsertedPlan = await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          smsCredits: plan.smsCredits,
          whatsappCredits: plan.whatsappCredits,
          allowFranchises: plan.allowFranchises,
          perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice,
          perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice,
          isActive: plan.isActive,
        },
        create: {
          name: plan.name,
          slug: plan.slug,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          maxBranches: plan.maxBranches,
          maxStaff: plan.maxStaff,
          smsCredits: plan.smsCredits,
          whatsappCredits: plan.whatsappCredits,
          allowFranchises: plan.allowFranchises,
          perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice,
          perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice,
          isActive: plan.isActive,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          monthlyPrice: true,
          annualPrice: true,
          maxBranches: true,
          maxStaff: true,
          allowFranchises: true,
          isActive: true,
        },
      });
      seededPlans.push(upsertedPlan);
    }

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
        monthlyPrice: Number(p.monthlyPrice),
        annualPrice: Number(p.annualPrice),
        maxBranches: p.maxBranches,
        maxStaff: p.maxStaff,
        allowFranchises: p.allowFranchises,
        isActive: p.isActive,
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
