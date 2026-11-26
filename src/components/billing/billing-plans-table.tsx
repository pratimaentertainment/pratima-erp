'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  Building2,
  Users,
  ShieldCheck,
  Zap,
  Star,
  PlusCircle,
  IndianRupee,
  Tag,
  Gift,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RazorpayCheckoutButton } from '@/components/billing/razorpay-checkout-button';
import { cn } from '@/lib/utils';
import {
  PLAN_FEATURES_CATALOG,
  getFeatureDefinition,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';

export interface SerializedPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  originalMonthlyPrice?: number | null;
  originalAnnualPrice?: number | null;
  offerBadgeText?: string | null;
  isBasePlan?: boolean;
  sortOrder?: number;
  maxBranches: number;
  maxStaff: number;
  features?: string[];
  smsCredits?: number;
  whatsappCredits?: number;
  isActive: boolean;
}

export interface SerializedPlanAddonItem {
  id: string;
  featureKey: string;
  name: string;
  description: string | null;
  originalMonthlyPrice?: number | null;
  monthlyPrice: number;
  originalAnnualPrice?: number | null;
  annualPrice: number;
}

export interface BillingPlansTableProps {
  plans: SerializedPlan[];
  addons?: SerializedPlanAddonItem[];
  currentPlanId?: string | null;
  currentBillingCycle?: string | null;
  subscriptionStatus?: string;
  initialEnabledAddons?: string[];
  initialDealerCode?: string | null;
  isFirstPaymentDiscountEligible?: boolean;
  defaultDiscountPercent?: number;
  aiEventCredits?: number;
}

export function BillingPlansTable({
  plans,
  addons = [],
  currentPlanId,
  currentBillingCycle,
  subscriptionStatus,
  initialEnabledAddons = [],
  initialDealerCode = null,
  isFirstPaymentDiscountEligible = false,
  defaultDiscountPercent = 0,
  aiEventCredits = 0,
}: BillingPlansTableProps) {
  const [isAnnual, setIsAnnual] = useState(currentBillingCycle === 'ANNUAL');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(initialEnabledAddons);
  const [dealerCode, setDealerCode] = useState<string>(initialDealerCode || '');
  const [discountPercent, setDiscountPercent] = useState<number>(defaultDiscountPercent || 0);

  const selectedCycle: 'MONTHLY' | 'ANNUAL' = isAnnual ? 'ANNUAL' : 'MONTHLY';

  useEffect(() => {
    try {
      if (initialDealerCode) {
        setDealerCode(initialDealerCode);
        localStorage.setItem('pratima_ref_code', initialDealerCode);
      } else if (isFirstPaymentDiscountEligible) {
        const saved = localStorage.getItem('pratima_ref_code');
        if (saved && !dealerCode) {
          setDealerCode(saved);
        }
      }
    } catch {}
  }, [initialDealerCode, isFirstPaymentDiscountEligible]);

  const toggleAddon = (featureKey: string) => {
    setSelectedAddons((prev) =>
      prev.includes(featureKey) ? prev.filter((k) => k !== featureKey) : [...prev, featureKey]
    );
  };

  const getPlanMetadata = (plan: SerializedPlan) => {
    const isPro = plan.slug.includes('pro') || plan.name.toLowerCase().includes('pro');
    const isEnterprise = plan.slug.includes('enterprise') || plan.name.toLowerCase().includes('enterprise');

    let badge: string | null = plan.offerBadgeText || null;
    let isRecommended = false;
    let tagline = 'Ideal for independent photographers and single-studio teams.';

    if (isPro) {
      if (!badge) badge = 'Recommended';
      isRecommended = true;
      tagline = 'For growing wedding and commercial studios managing multi-crew shoots.';
    } else if (isEnterprise) {
      if (!badge) badge = 'Enterprise';
      tagline = 'For large production houses, studio franchises, and high-volume media teams.';
    } else if (plan.isBasePlan && !badge) {
      badge = 'Base Plan';
    }

    const resolvedFeatureKeys =
      plan.features && plan.features.length > 0
        ? plan.features
        : isEnterprise
        ? ENTERPRISE_DEFAULT_FEATURES
        : isPro
        ? PRO_DEFAULT_FEATURES
        : STARTER_DEFAULT_FEATURES;

    const featureList: string[] = [
      plan.maxBranches === 1 ? '1 Studio Headquarters' : `Up to ${plan.maxBranches} Studio Branches`,
      `Up to ${plan.maxStaff} Staff & Crew Accounts`,
      'GST Compliant Quotations & Tax Invoices',
      'Shoot Calendar & Crew Rostering',
    ];

    for (const key of resolvedFeatureKeys) {
      const def = getFeatureDefinition(key);
      if (def && !featureList.includes(def.label)) {
        featureList.push(def.label);
      }
    }

    return { badge, isRecommended, tagline, featureList };
  };

  // Add-on cost calculation for the selected cycle
  const addonsTotalRate = selectedAddons.reduce((acc, key) => {
    const a = addons.find((item) => item.featureKey === key);
    if (!a) return acc;
    return acc + (isAnnual ? a.annualPrice : a.monthlyPrice);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Top Bar: Billing Switcher & Partner Referral Discount Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Billing Switcher (Monthly vs Annual) */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card/60 backdrop-blur-xs">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Billing Frequency</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Annual billing saves up to 20% on studio plans.
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
                Save ~17%
              </Badge>
            </span>
          </div>
        </div>

        {/* Partner Referral Discount Box */}
        {isFirstPaymentDiscountEligible ? (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Gift className="h-4 w-4" />
                First-Payment Partner Discount
              </span>
              {discountPercent > 0 && (
                <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                  {discountPercent}% OFF APPLIED
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Enter Partner Code (e.g. DEALER10)"
                  value={dealerCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    setDealerCode(code);
                    try {
                      localStorage.setItem('pratima_ref_code', code);
                    } catch {}
                  }}
                  className="h-8 pl-8 text-xs uppercase font-mono tracking-wider"
                />
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                Valid on first checkout
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Enterprise Billing Protection
              </span>
              <p className="text-[11px] text-muted-foreground">
                All subscriptions are billed securely via Razorpay with 100% compliant Indian GST invoices.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const { badge, isRecommended, tagline, featureList } = getPlanMetadata(plan);
          const effectiveMonthly = isAnnual
            ? Math.round(plan.annualPrice / 12)
            : plan.monthlyPrice;

          const effectiveOriginalMonthly = isAnnual
            ? plan.originalAnnualPrice
              ? Math.round(plan.originalAnnualPrice / 12)
              : null
            : plan.originalMonthlyPrice || null;

          const discountPct =
            effectiveOriginalMonthly && effectiveOriginalMonthly > effectiveMonthly
              ? Math.round(((effectiveOriginalMonthly - effectiveMonthly) / effectiveOriginalMonthly) * 100)
              : 0;

          // Compute plan + addon total preview with Partner Discount
          const planBaseRate = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const planPlusAddonsSubtotal = planBaseRate + addonsTotalRate;

          // Calculate partner first payment discount if applicable
          const activeDiscountRate =
            isFirstPaymentDiscountEligible && (discountPercent > 0 || dealerCode)
              ? discountPercent > 0
                ? discountPercent
                : 10
              : 0;

          const partnerDiscountAmount =
            activeDiscountRate > 0
              ? Math.round(((planPlusAddonsSubtotal * activeDiscountRate) / 100) * 100) / 100
              : 0;

          const discountedSubtotal = Math.max(0, planPlusAddonsSubtotal - partnerDiscountAmount);
          const gstAmount = Math.round(discountedSubtotal * 0.18 * 100) / 100;
          const grandTotal = Math.round((discountedSubtotal + gstAmount) * 100) / 100;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-xl border p-6 transition-all bg-card',
                isCurrentPlan
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : isRecommended
                  ? 'border-primary shadow-sm ring-1 ring-primary/20'
                  : 'border-border/80 hover:border-border',
                plan.isBasePlan && !isCurrentPlan && 'border-emerald-500/50'
              )}
            >
              {/* Badges */}
              <div className="absolute -top-3 left-4 flex gap-1.5">
                {isCurrentPlan ? (
                  <Badge className="bg-emerald-600 text-white font-bold px-2.5 py-0.5 text-[10px] shadow-xs">
                    Current Active Tier
                  </Badge>
                ) : badge ? (
                  <Badge
                    className={cn(
                      'font-bold px-2.5 py-0.5 text-[10px] shadow-xs',
                      isRecommended
                        ? 'bg-primary text-primary-foreground'
                        : plan.isBasePlan
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    )}
                  >
                    {plan.isBasePlan && <Star className="h-2.5 w-2.5 fill-current inline mr-1" />}
                    {badge}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-5 pt-1">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold font-heading text-foreground">{plan.name}</h4>
                    {plan.isBasePlan && (
                      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/40">
                        Base Plan
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{tagline}</p>
                </div>

                {/* Price with Strikethrough MRP */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-baseline gap-2">
                    {effectiveOriginalMonthly && effectiveOriginalMonthly > effectiveMonthly && (
                      <span className="text-sm line-through text-muted-foreground font-semibold">
                        ₹{effectiveOriginalMonthly.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-3xl font-black font-heading text-foreground">
                      ₹{effectiveMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                    {discountPct > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold"
                      >
                        {discountPct}% OFF
                      </Badge>
                    )}
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
                        <span className="leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Live Checkout Total Preview */}
                {(selectedAddons.length > 0 || partnerDiscountAmount > 0) && (
                  <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 space-y-1 text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Plan + {selectedAddons.length} Add-ons:</span>
                      <span className="font-mono font-medium text-foreground">
                        ₹{planPlusAddonsSubtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {partnerDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Partner Discount (-{activeDiscountRate}%):</span>
                        <span className="font-mono">-₹{partnerDiscountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-muted-foreground">
                      <span>+ 18% GST:</span>
                      <span className="font-mono">₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t border-primary/20">
                      <span>Total ({selectedCycle}):</span>
                      <span className="font-mono text-primary font-black">
                        ₹{grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout / Upgrade CTA */}
              <div className="pt-6 mt-4 border-t border-border/50">
                {isCurrentPlan && subscriptionStatus === 'ACTIVE' && selectedAddons.length === 0 ? (
                  <div className="w-full">
                    <RazorpayCheckoutButton
                      planId={plan.id}
                      billingCycle={selectedCycle}
                      addonKeys={selectedAddons}
                      dealerCode={dealerCode || undefined}
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
                    addonKeys={selectedAddons}
                    dealerCode={dealerCode || undefined}
                    buttonText={
                      subscriptionStatus === 'TRIAL'
                        ? selectedAddons.length > 0
                          ? `Activate ${plan.name} + Add-ons`
                          : `Activate ${plan.name}`
                        : selectedAddons.length > 0
                        ? `Checkout ${plan.name} + Add-ons`
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

            {/* AI Face Recognition Event Credits & Pay-Per-Event Wallet Card */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-bold font-heading text-foreground">
                AI Face Recognition &amp; Smart Photo Delivery
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary">
                Pay-Per-Event
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              No mandatory monthly fees. Only unlock AI face matching when you have active wedding or event shoots. 
              Guests take a quick selfie on their phone and instantly view all their photos. 1 credit unlocks 1 full shoot.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-background/80 border border-border/80 px-4 py-3 rounded-xl shrink-0">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Wallet Balance
              </span>
              <div className="text-xl font-black font-heading text-primary">
                {aiEventCredits} <span className="text-xs font-normal text-muted-foreground">Credits</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
          <RazorpayCheckoutButton
            purchaseType="PER_EVENT_AI"
            buttonText="Buy Single Event Credit (₹149 + GST)"
            variant="outline"
            size="sm"
            className="text-xs border-primary/30 text-foreground hover:bg-primary/5"
          />
          <RazorpayCheckoutButton
            purchaseType="AI_CREDIT_PACK"
            addonFeatureKey="AI_FACE_RECOGNITION_PACK_10"
            buttonText="Buy 10-Event Pack (₹1,199 + GST — Save 20%)"
            size="sm"
            className="text-xs font-bold"
          />
          <span className="text-[11px] text-muted-foreground">
            • Credits never expire • Instant wallet activation via Razorpay
          </span>
        </div>
      </div>

      {/* Modular Optional Add-ons Customizer Table */}
      {addons.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold font-heading text-foreground">
                  Custom Modular Add-ons ({selectedAddons.length} selected)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle standalone modules to attach them to your subscription checkout. They will auto-activate immediately upon payment.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
              Add-ons Total: ₹{addonsTotalRate.toLocaleString('en-IN')}/{isAnnual ? 'yr' : 'mo'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map((addon) => {
              const isSelected = selectedAddons.includes(addon.featureKey);
              const origRate = isAnnual ? addon.originalAnnualPrice : addon.originalMonthlyPrice;
              const curRate = isAnnual ? addon.annualPrice : addon.monthlyPrice;

              return (
                <div
                  key={addon.featureKey}
                  onClick={() => toggleAddon(addon.featureKey)}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border/70 bg-card hover:border-border'
                  )}
                >
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleAddon(addon.featureKey)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {addon.name}
                      </span>
                      <div className="flex items-baseline gap-1 shrink-0 font-mono text-[11px]">
                        {origRate && origRate > curRate && (
                          <span className="line-through text-muted-foreground text-[10px]">
                            ₹{origRate.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="font-bold text-primary">
                          ₹{curRate.toLocaleString('en-IN')}/{isAnnual ? 'yr' : 'mo'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {addon.description || 'Enterprise modular capability.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
