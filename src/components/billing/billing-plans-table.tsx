'use client';

import * as React from 'react';
import { Check, Sparkles, Building2, Users, Smartphone, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RazorpayCheckoutButton } from '@/components/billing/razorpay-checkout-button';
import { cn } from '@/lib/utils';

export interface SerializedPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  maxBranches: number;
  maxStaff: number;
  smsCredits: number;
  whatsappCredits: number;
  isActive: boolean;
}

export interface BillingPlansTableProps {
  plans: SerializedPlan[];
  currentPlanId?: string | null;
  currentBillingCycle?: string | null;
  subscriptionStatus?: string;
}

export function BillingPlansTable({
  plans,
  currentPlanId,
  currentBillingCycle,
  subscriptionStatus,
}: BillingPlansTableProps) {
  const [isAnnual, setIsAnnual] = React.useState(currentBillingCycle === 'ANNUAL');

  const selectedCycle: 'MONTHLY' | 'ANNUAL' = isAnnual ? 'ANNUAL' : 'MONTHLY';

  const getPlanMetadata = (plan: SerializedPlan) => {
    const isPro = plan.slug.includes('pro') || plan.name.toLowerCase().includes('pro');
    const isEnterprise = plan.slug.includes('enterprise') || plan.name.toLowerCase().includes('enterprise');

    let badge: string | null = null;
    let isRecommended = false;
    let tagline = 'Ideal for independent photographers and single-studio teams.';

    if (isPro) {
      badge = 'Recommended';
      isRecommended = true;
      tagline = 'For growing wedding and commercial studios managing multi-crew shoots.';
    } else if (isEnterprise) {
      badge = 'Enterprise';
      tagline = 'For large production houses, studio franchises, and high-volume media teams.';
    }

    const featureList = [
      plan.maxBranches === 1 ? '1 Studio Location' : `Up to ${plan.maxBranches} Studio Branches`,
      `Up to ${plan.maxStaff} Staff & Crew Accounts`,
      `${plan.smsCredits.toLocaleString('en-IN')} SMS Notifications`,
      `${plan.whatsappCredits.toLocaleString('en-IN')} WhatsApp Cloud API Credits`,
      'GST Compliant Quotations & Tax Invoices',
      'Shoot Calendar & Crew Rostering',
    ];

    if (isPro || isEnterprise) {
      featureList.push('Watermarked Proofing Selection Portal');
      featureList.push('Automated WhatsApp Shoot Reminders');
      featureList.push('Camera & Gear Inventory Tracking');
    }

    if (isEnterprise) {
      featureList.push('Double-Entry Accounting & Financial Ledgers');
      featureList.push('Shoot Profit & Loss Margin Analytics');
      featureList.push('VIP Dedicated Support & Custom Domain');
    }

    return { badge, isRecommended, tagline, featureList };
  };

  return (
    <div className="space-y-6">
      {/* Billing Switcher (Monthly vs Annual) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-xs">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Select Billing Frequency</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Annual billing saves up to 20% on all studio subscription plans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-xs font-medium cursor-pointer transition-colors',
              !isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual billing discount"
            onClick={() => setIsAnnual((prev) => !prev)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isAnnual ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                isAnnual ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>

          <span
            className={cn(
              'text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5',
              isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold py-0"
            >
              Save 20%
            </Badge>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const { badge, isRecommended, tagline, featureList } = getPlanMetadata(plan);
          const effectiveMonthly = isAnnual
            ? Math.round(plan.annualPrice / 12)
            : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-xl border p-6 transition-all bg-card',
                isCurrentPlan
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : isRecommended
                  ? 'border-primary shadow-sm ring-1 ring-primary/20'
                  : 'border-border/80 hover:border-border'
              )}
            >
              {/* Badges */}
              <div className="absolute -top-3 left-4 flex gap-1.5">
                {isCurrentPlan ? (
                  <Badge className="bg-emerald-600 text-white font-bold px-2.5 py-0.5 text-[10px] shadow-xs">
                    Current Active Tier
                  </Badge>
                ) : badge ? (
                  <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-[10px] shadow-xs">
                    {badge}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-5 pt-1">
                {/* Header */}
                <div>
                  <h4 className="text-lg font-bold font-heading text-foreground">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{tagline}</p>
                </div>

                {/* Price */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-heading text-foreground">
                      ₹{effectiveMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isAnnual
                      ? `Billed annually at ₹${plan.annualPrice.toLocaleString('en-IN')} + 18% GST`
                      : 'Billed monthly + 18% GST'}
                  </p>
                </div>

                {/* Quotas */}
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/40 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{plan.maxBranches} {plan.maxBranches === 1 ? 'Location' : 'Branches'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{plan.maxStaff} Staff Accounts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{plan.smsCredits} SMS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{plan.whatsappCredits} WhatsApp</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Included capabilities:
                  </p>
                  <ul className="space-y-2">
                    {featureList.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Checkout / Upgrade CTA */}
              <div className="pt-6 mt-4 border-t border-border/50">
                {isCurrentPlan && subscriptionStatus === 'ACTIVE' ? (
                  <div className="w-full">
                    <RazorpayCheckoutButton
                      planId={plan.id}
                      billingCycle={selectedCycle}
                      buttonText="Renew / Extend Subscription"
                      variant="outline"
                      className="w-full text-xs"
                    />
                    <p className="text-center text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                      ✓ Currently active on your studio
                    </p>
                  </div>
                ) : (
                  <RazorpayCheckoutButton
                    planId={plan.id}
                    billingCycle={selectedCycle}
                    buttonText={
                      subscriptionStatus === 'TRIAL'
                        ? `Activate ${plan.name}`
                        : `Switch to ${plan.name}`
                    }
                    variant={isRecommended ? 'default' : 'outline'}
                    className="w-full text-xs"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
