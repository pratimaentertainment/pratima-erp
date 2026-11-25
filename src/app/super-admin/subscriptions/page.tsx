import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  CreditCard,
  Sparkles,
  GitBranch,
  Users,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  Check,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreatePlanDialog } from './create-plan-dialog';
import { PlanActions } from './plan-actions';
import { AddonPriceListManager } from './addon-price-list-manager';
import { ensureAddonPriceListInitialized } from '@/actions/subscription.actions';
import {
  PLAN_FEATURES_CATALOG,
  getFeatureDefinition,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';

export const metadata: Metadata = {
  title: 'Subscription Plans & Add-on Catalog - Super Admin | Pratima ERP',
  description: 'Enterprise B2B SaaS subscription, modular add-on pricing, and billing tier management.',
};

export default async function SuperAdminSubscriptionsPage() {
  // 1. Enforce Super Admin authorization
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user || userRole !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  // 2. Ensure addon price catalog is initialized with defaults
  await ensureAddonPriceListInitialized();

  // 3. Fetch Subscription Plans, Addons, and stats directly via Prisma
  const [plans, addons, totalSubscriptionsCount, totalTenantsCount] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    }),
    prisma.planAddonConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.tenantSubscription.count(),
    prisma.tenant.count(),
  ]);

  const activePlansCount = plans.filter((p) => p.isActive).length;

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
              Subscription Plans &amp; Add-on Catalog
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] tracking-wider uppercase font-mono border-primary/30 text-primary bg-primary/5"
            >
              Billing &amp; Add-ons
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure recurring SaaS tiers, strike-through MRP pricing, Base Plan designation, and modular add-on capability pricing.
          </p>
        </div>

        {/* Action: Create New Plan Modal */}
        <div className="flex items-center gap-3">
          <CreatePlanDialog />
        </div>
      </div>

      {/* KPI Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Plans
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              {plans.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configured SaaS packages
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Tiers
            </CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400">
              {activePlansCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Available for public signup
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Modular Add-ons
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              {addons.filter((a) => a.isActive).length} / {addons.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active purchasable modules
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subscribed Studios
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              {totalSubscriptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Across all paid studios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-foreground">
            Configured Pricing Tiers ({plans.length})
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            Sorted by order &amp; monthly fee (asc)
          </span>
        </div>

        {plans.length === 0 ? (
          <Card className="border-dashed border-2 border-border/80 bg-muted/20 text-center py-12 p-6">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  No subscription plans configured
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Define your first SaaS subscription tier to start onboarding paid photography studios.
                </p>
              </div>
              <div className="pt-2">
                <CreatePlanDialog />
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const monthlyNum = Number(plan.monthlyPrice);
              const origMonthlyNum = plan.originalMonthlyPrice ? Number(plan.originalMonthlyPrice) : null;
              const annualNum = Number(plan.annualPrice);
              const origAnnualNum = plan.originalAnnualPrice ? Number(plan.originalAnnualPrice) : null;

              const monthlySavings =
                origMonthlyNum && origMonthlyNum > monthlyNum
                  ? Math.round(((origMonthlyNum - monthlyNum) / origMonthlyNum) * 100)
                  : 0;

              const annualSavingsPercentage =
                monthlyNum > 0
                  ? Math.round(((monthlyNum * 12 - annualNum) / (monthlyNum * 12)) * 100)
                  : 0;

              const planFeatures =
                plan.features && plan.features.length > 0
                  ? plan.features
                  : plan.slug.includes('enterprise')
                  ? ENTERPRISE_DEFAULT_FEATURES
                  : plan.slug.includes('pro')
                  ? PRO_DEFAULT_FEATURES
                  : STARTER_DEFAULT_FEATURES;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between border-border/70 bg-card hover:border-primary/40 transition-all shadow-xs relative ${
                    plan.isBasePlan ? 'ring-2 ring-emerald-500/50' : ''
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold font-heading text-foreground">
                            {plan.name}
                          </CardTitle>
                          {plan.isBasePlan && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] px-1.5 py-0 flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              Base Plan
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {plan.slug}
                          </span>
                          {plan.offerBadgeText && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                            >
                              {plan.offerBadgeText}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={plan.isActive ? 'default' : 'secondary'}
                        className="text-[10px] uppercase font-mono tracking-wider shrink-0"
                      >
                        {plan.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </div>

                    {/* Price display with Strikethrough MRP */}
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-baseline gap-2">
                        {origMonthlyNum && origMonthlyNum > monthlyNum && (
                          <span className="text-base line-through text-muted-foreground">
                            ₹{origMonthlyNum.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-2xl font-extrabold font-heading text-foreground">
                          ₹{monthlyNum.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                        {monthlySavings > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          >
                            {monthlySavings}% OFF
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>
                          Annual:{' '}
                          {origAnnualNum && origAnnualNum > annualNum && (
                            <span className="line-through mr-1">
                              ₹{origAnnualNum.toLocaleString('en-IN')}
                            </span>
                          )}
                          ₹{annualNum.toLocaleString('en-IN')}/yr
                        </span>
                        {annualSavingsPercentage > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          >
                            Save {annualSavingsPercentage}% on Annual
                          </Badge>
                        )}
                        {plan.allowFranchises && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-primary/20"
                          >
                            Franchise Ready (+₹{Number(plan.perFranchiseMonthlyPrice || 0)}/mo)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Quotas & Limits */}
                    <div className="space-y-2.5 pt-3 border-t border-border/50 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-primary" />
                          <span>Max Branches</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {plan.maxBranches}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>Max Staff Accounts</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {plan.maxStaff}
                        </span>
                      </div>
                    </div>

                    {/* Features Matrix Badge List */}
                    <div className="pt-3 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Included Modules ({planFeatures.length})</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {planFeatures.map((fk) => {
                          const def = getFeatureDefinition(fk);
                          return (
                            <Badge
                              key={fk}
                              variant="secondary"
                              className="text-[10px] font-medium py-0 px-1.5 bg-muted/60 text-foreground"
                            >
                              {def?.label || fk}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subscriber Count & Creation Date */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <strong>{plan._count.subscriptions}</strong> subscribed studios
                      </span>
                      <span className="font-mono text-[10px]">
                        Order: {plan.sortOrder}
                      </span>
                    </div>

                    {/* Super Admin Plan Governance Actions */}
                    <PlanActions
                      plan={{
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
                        features: plan.features,
                        smsCredits: plan.smsCredits,
                        whatsappCredits: plan.whatsappCredits,
                        allowFranchises: plan.allowFranchises,
                        perFranchiseMonthlyPrice: plan.perFranchiseMonthlyPrice ? Number(plan.perFranchiseMonthlyPrice) : 0,
                        perFranchiseAnnualPrice: plan.perFranchiseAnnualPrice ? Number(plan.perFranchiseAnnualPrice) : 0,
                        isActive: plan.isActive,
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modular Add-on Price Catalog Manager */}
      <div className="pt-4">
        <AddonPriceListManager
          addons={addons.map((a) => ({
            id: a.id,
            featureKey: a.featureKey,
            name: a.name,
            description: a.description,
            originalMonthlyPrice: a.originalMonthlyPrice ? Number(a.originalMonthlyPrice) : null,
            monthlyPrice: Number(a.monthlyPrice),
            originalAnnualPrice: a.originalAnnualPrice ? Number(a.originalAnnualPrice) : null,
            annualPrice: Number(a.annualPrice),
            isActive: a.isActive,
            sortOrder: a.sortOrder,
          }))}
        />
      </div>
    </div>
  );
}
