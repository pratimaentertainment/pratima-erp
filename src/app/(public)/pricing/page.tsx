import * as React from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Sparkles } from 'lucide-react';
import {
  PricingTableClient,
  type SerializedSubscriptionPlan,
} from './pricing-table-client';

export const metadata: Metadata = {
  title: 'Pricing Plans - Pratima ERP | Studio Operating System',
  description:
    'Simple, transparent pricing for Indian photography studios. Scale your wedding shoots, crew roster, client proofing, and GST invoicing.',
};

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  let serializedPlans: SerializedSubscriptionPlan[] = [];

  try {
    // 1. Fetch active plans from Prisma database ordered by price
    const dbPlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    // 2. Serialize Decimal fields for React Server Component -> Client Component boundary
    serializedPlans = dbPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      maxBranches: plan.maxBranches,
      maxStaff: plan.maxStaff,
      features: plan.features || [],
      allowFranchises: plan.allowFranchises,
      perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice ? Number(plan.perFranchiseMonthlyPrice) : 0,
      perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice ? Number(plan.perFranchiseAnnualPrice) : 0,
    }));
  } catch (error) {
    console.error('[/pricing] Error fetching subscription plans from database:', error);
    serializedPlans = [];
  }

  return (
    <div className="py-12 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Built Specifically for Indian Photography Studios</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-heading text-foreground">
            Simple, Transparent Pricing for Creative Studios
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            From solo wedding cinematographers to multi-branch production teams.
            Streamline leads, bookings, payments, and client proofing on one unified platform.
          </p>
        </div>

        {/* Interactive Pricing Engine (Monthly/Annual Switcher, Quotas, CTAs, FAQs) */}
        <PricingTableClient plans={serializedPlans} />
      </div>
    </div>
  );
}
