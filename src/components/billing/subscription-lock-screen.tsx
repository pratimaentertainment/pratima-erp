import * as React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { signOut } from '@/auth';
import {
  Lock,
  ShieldAlert,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Mail,
  Headphones,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BillingPlansTable,
  type SerializedPlan,
} from '@/components/billing/billing-plans-table';

export interface SubscriptionLockScreenProps {
  tenantId: string;
  tenantName?: string;
  reason?: 'TRIAL_EXPIRED' | 'SUBSCRIPTION_EXPIRED' | 'NONE';
  daysLeft?: number;
  userEmail?: string;
  userName?: string;
}

/**
 * Hard Lock Screen Component (Phase 13.3).
 *
 * Full-page, non-dismissible server component displayed when a tenant's
 * 15-day trial or active subscription has expired. Bypasses the sidebar and
 * CRM modules while providing direct, inline checkout via Razorpay so studio
 * owners can instantly reactivate their workspace.
 */
export async function SubscriptionLockScreen({
  tenantId,
  tenantName = 'Studio',
  reason = 'SUBSCRIPTION_EXPIRED',
  daysLeft = 0,
  userEmail,
  userName,
}: SubscriptionLockScreenProps) {
  // 1. Fetch available plans and current subscription status from DB
  const [allPlans, tenantSub, tenantRecord] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    }),
  ]);

  // 2. Serialize Decimal fields for Client Component boundary
  const serializedPlans: SerializedPlan[] = allPlans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    monthlyPrice: Number(p.monthlyPrice),
    annualPrice: Number(p.annualPrice),
    maxBranches: p.maxBranches,
    maxStaff: p.maxStaff,
    smsCredits: p.smsCredits,
    whatsappCredits: p.whatsappCredits,
    isActive: p.isActive,
  }));

  const isTrial = reason === 'TRIAL_EXPIRED' || tenantRecord?.subscriptionStatus === 'TRIAL';
  const displayName = tenantRecord?.tradeName || tenantRecord?.name || tenantName;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between p-4 sm:p-8 relative selection:bg-destructive/20">
      {/* Subtle background ambient gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-destructive/10 rounded-full blur-3xl opacity-40" />
      </div>

      {/* Top Header Bar: Brand + Tenant Profile + Sign Out Action */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg font-heading shadow-xs">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold font-heading text-foreground tracking-tight text-base sm:text-lg">
                Pratima ERP
              </span>
              <Badge
                variant="outline"
                className="border-destructive/30 text-destructive bg-destructive/10 text-[10px] font-bold px-1.5 py-0 uppercase"
              >
                Access Locked
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              <span>{displayName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(userName || userEmail) && (
            <div className="hidden sm:flex flex-col text-right">
              {userName && (
                <span className="text-xs font-semibold text-foreground">{userName}</span>
              )}
              {userEmail && (
                <span className="text-[11px] text-muted-foreground font-mono">{userEmail}</span>
              )}
            </div>
          )}

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="text-xs gap-1.5 h-8 border-border/80 hover:bg-muted"
              title="Sign out of Pratima ERP"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Button>
          </form>
        </div>
      </header>

      {/* Main Lock Hero & Plan Upgrade Matrix */}
      <main className="w-full max-w-7xl mx-auto flex-1 py-8 sm:py-12 space-y-10">
        {/* Lock Announcement Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shadow-lg">
                <Lock className="h-8 w-8" />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center ring-2 ring-background">
                <ShieldAlert className="h-3 w-3 text-destructive-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold px-3 py-1"
            >
              {isTrial ? '15-Day Free Trial Ended' : 'Subscription Suspended'}
            </Badge>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-foreground tracking-tight">
              {isTrial
                ? 'Your Free Trial Has Expired'
                : 'Your Subscription Has Expired'}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Your {isTrial ? 'Trial' : 'Subscription'} has expired. To continue using Pratima ERP
              and access your leads, shoot calendar, client proofing galleries, and accounting ledgers,
              please upgrade your plan.
            </p>
          </div>

          {/* Zero Data Loss Guarantee Banner */}
          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Zero Data Loss Guarantee</h4>
                <p className="text-[11px] text-muted-foreground">
                  All your client databases, shoot bookings, albums, and financial ledgers remain 100% encrypted and intact.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              Instant Workspace Reactivation
            </span>
          </div>
        </div>

        {/* Embedded Billing Plans Table with Razorpay Checkout */}
        <div className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold font-heading text-foreground">
              Select a Plan to Unlock Your Studio
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose your preferred tier and billing cycle below. Payments are processed securely via Razorpay with instant workspace reactivation.
            </p>
          </div>

          <BillingPlansTable
            plans={serializedPlans}
            currentPlanId={tenantSub?.planId}
            currentBillingCycle={tenantSub?.billingCycle}
            subscriptionStatus={tenantRecord?.subscriptionStatus}
          />
        </div>
      </main>

      {/* Security & Support Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>PCI-DSS Level 1 &amp; ISO 27001 Certified Payment Infrastructure powered by Razorpay</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            billing@pratimaerp.com
          </span>
          <span className="flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" />
            Priority Billing Desk
          </span>
        </div>
      </footer>
    </div>
  );
}
