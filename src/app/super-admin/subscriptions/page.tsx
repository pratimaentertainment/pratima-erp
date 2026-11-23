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
  MessageSquare,
  PhoneCall,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
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

export const metadata: Metadata = {
  title: 'Subscription Plans - Super Admin | Pratima ERP',
  description: 'Enterprise B2B SaaS subscription and billing tier management.',
};

export default async function SuperAdminSubscriptionsPage() {
  // 1. Enforce Super Admin authorization
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user || userRole !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  // 2. Fetch Subscription Plans and stats directly via Prisma
  const [plans, totalSubscriptionsCount, totalTenantsCount] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: { monthlyPrice: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
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
              Subscription Plans
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] tracking-wider uppercase font-mono border-primary/30 text-primary bg-primary/5"
            >
              Billing Engine
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure recurring SaaS tiers, pricing models, studio quotas, and automated messaging allocations.
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
              {activePlansCount} currently active for enrollment
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Subscriptions
            </CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400">
              {totalSubscriptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live studio subscription contracts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Studios
            </CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              {totalTenantsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Registered studios in the platform
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Billing Gateway
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-bold text-foreground">
              Razorpay &amp; Cashfree
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              UPI, Recurring Mandate, GST Ready
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
            Sorted by monthly fee (asc)
          </span>
        </div>

        {plans.length === 0 ? (
          /* Empty State */
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
              const annualNum = Number(plan.annualPrice);
              const effectiveAnnualMonthly = Math.round(annualNum / 12);
              const savingsPercentage =
                monthlyNum > 0
                  ? Math.round(((monthlyNum * 12 - annualNum) / (monthlyNum * 12)) * 100)
                  : 0;

              return (
                <Card
                  key={plan.id}
                  className="flex flex-col justify-between border-border/70 bg-card hover:border-primary/40 transition-all shadow-xs"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold font-heading text-foreground">
                          {plan.name}
                        </CardTitle>
                        <span className="inline-block font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {plan.slug}
                        </span>
                      </div>
                      <Badge
                        variant={plan.isActive ? 'default' : 'secondary'}
                        className="text-[10px] uppercase font-mono tracking-wider"
                      >
                        {plan.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </div>

                    {/* Price display */}
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold font-heading text-foreground">
                          ₹{monthlyNum.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>Annual: ₹{annualNum.toLocaleString('en-IN')}/yr</span>
                        {savingsPercentage > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          >
                            Save {savingsPercentage}%
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

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Included SMS Credits</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {plan.smsCredits.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Included WhatsApp Credits</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {plan.whatsappCredits.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Subscriber Count & Creation Date */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <strong>{plan._count.subscriptions}</strong> subscribed studios
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(plan.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
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
                        maxBranches: plan.maxBranches,
                        maxStaff: plan.maxStaff,
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
    </div>
  );
}
