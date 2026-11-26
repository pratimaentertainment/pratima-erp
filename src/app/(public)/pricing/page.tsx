import * as React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  Camera,
  ArrowRight,
  Receipt,
  Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  PricingTableClient,
  type SerializedSubscriptionPlan,
  type SerializedPlanAddon,
} from './pricing-table-client';
import { ensureAddonPriceListInitialized } from '@/actions/subscription.actions';
import {
  getCachedSubscriptionPlans,
  getCachedPlanAddons,
  CANONICAL_PLAN_SLUGS,
  CANONICAL_ADDON_KEYS,
} from '@/services/catalog-cache.service';

export const metadata: Metadata = {
  title: 'Pricing Plans | FRAMIQ by Pratima Entertainment & Technology',
  description:
    'Simple, transparent pricing for Indian photography studios. Scale your wedding shoots, crew roster, client proofing, and GST invoicing with FRAMIQ by Pratima Entertainment & Technology.',
};

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  let serializedPlans: SerializedSubscriptionPlan[] = [];
  let serializedAddons: SerializedPlanAddon[] = [];

  try {
    await ensureAddonPriceListInitialized();

    // 1. Fetch active plans and modular addons from cached catalog service
    const [dbPlans, dbAddons] = await Promise.all([
      getCachedSubscriptionPlans(),
      getCachedPlanAddons(),
    ]);

    // 2. Double-guarantee canonical filtering
    const filteredPlans = dbPlans.filter((p) =>
      (CANONICAL_PLAN_SLUGS as readonly string[]).includes(p.slug)
    );
    const filteredAddons = dbAddons.filter((a) =>
      (CANONICAL_ADDON_KEYS as readonly string[]).includes(a.featureKey)
    );

    // 3. Serialize Decimal fields for React Server Component -> Client Component boundary
    serializedPlans = filteredPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      originalMonthlyPrice: plan.originalMonthlyPrice ? Number(plan.originalMonthlyPrice) : null,
      originalAnnualPrice: plan.originalAnnualPrice ? Number(plan.originalAnnualPrice) : null,
      offerBadgeText: plan.offerBadgeText,
      isBasePlan: plan.isBasePlan,
      sortOrder: plan.sortOrder,
      maxBranches: plan.maxBranches,
      maxStaff: plan.maxStaff,
      features: plan.features || [],
      allowFranchises: plan.allowFranchises,
      perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice ? Number(plan.perFranchiseMonthlyPrice) : 0,
      perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice ? Number(plan.perFranchiseAnnualPrice) : 0,
      franchiseEnabled: plan.franchiseEnabled,
      includedAddons: plan.includedAddons,
    }));

    serializedAddons = filteredAddons.map((addon) => ({
      id: addon.id,
      featureKey: addon.featureKey,
      name: addon.name,
      description: addon.description,
      originalMonthlyPrice: addon.originalMonthlyPrice ? Number(addon.originalMonthlyPrice) : null,
      monthlyPrice: Number(addon.monthlyPrice),
      originalAnnualPrice: addon.originalAnnualPrice ? Number(addon.originalAnnualPrice) : null,
      annualPrice: Number(addon.annualPrice),
      billingType: addon.billingType,
      creditsIncluded: addon.creditsIncluded,
    }));
  } catch (error) {
    console.error('[/pricing] Error fetching subscription plans from database:', error);
    serializedPlans = [];
    serializedAddons = [];
  }

  return (
    <div className="py-8 sm:py-16 space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* =========================================================================
            HERO VALUE BANNER WITH STUDIO VISUAL + DASHBOARD PREVIEW FRAME
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-b border-border/60 pb-16">
          {/* Left Column: Value Proposition & Trust Badges */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Camera className="h-3.5 w-3.5" />
              <span>Built Specifically for Indian Wedding &amp; Event Studios</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-heading text-foreground leading-[1.15]">
              Complete Photography Studio CRM + ERP — Built for Indian Weddings &amp; Events
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Replace scattered Excel sheets, diary notes, and WhatsApp chaos. Manage inquiries, multi-day wedding quotations, freelancer crews, GST invoices, and client album selections in one fast cloud workspace.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-extrabold text-sm bg-primary hover:bg-primary/90 text-white shadow-lg transition-all"
              >
                <span>Start 15-Day Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#plans"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-muted/60 hover:bg-muted text-foreground border border-border/80 transition-all"
              >
                <span>Explore Transparent Pricing</span>
              </a>
            </div>

            {/* 4 Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-4 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">15-Day Free Trial (No Card)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">18% GST &amp; Non-GST Ready</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">Unlimited Non-Login Freelancers</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">Pay-As-You-Need AI Face Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Column: Rich Visual Studio Artwork & Live Dashboard Preview */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl border-2 border-border/80 bg-slate-950 p-2 shadow-2xl overflow-hidden group">
              <Image
                src="/images/pricing/studio-hero.png"
                alt="FRAMIQ Photography Studio Command Center and ERP Dashboard"
                width={800}
                height={533}
                priority
                className="rounded-xl w-full h-auto object-cover border border-slate-800"
              />

              {/* Top Floating Glass Badge */}
              <div className="absolute top-4 left-4 right-4 sm:right-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 px-3.5 shadow-xl flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-white">14 Active Wedding Shoots</span>
                  <span className="text-slate-300 ml-1.5">• Zero Double-Bookings</span>
                </div>
              </div>

              {/* Bottom Floating Glass Badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 px-3.5 shadow-xl flex items-center justify-between gap-2">
                <div className="text-[11px] leading-tight">
                  <div className="text-slate-300 font-medium">Pending Installment Collections</div>
                  <div className="text-emerald-400 font-mono font-bold text-xs">₹4,85,000 on Muhurat Dates</div>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold bg-primary/20 text-primary-foreground border-primary/40 shrink-0">
                  AI Gallery Ready
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PRICING ENGINE & INTERACTIVE SHOWCASE
            ========================================================================= */}
        <div id="plans" className="scroll-mt-12">
          <PricingTableClient plans={serializedPlans} addons={serializedAddons} />
        </div>
      </div>
    </div>
  );
}
