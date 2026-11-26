'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  ChevronDown,
  Network,
  Star,
  PlusCircle,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getFeatureDefinition,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';

export interface SerializedSubscriptionPlan {
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
  allowFranchises?: boolean;
  perFranchiseMonthlyPrice?: number;
  perFranchiseAnnualPrice?: number;
  franchiseEnabled?: boolean;
  includedAddons?: string[];
}

export interface SerializedPlanAddon {
  id: string;
  featureKey: string;
  name: string;
  description: string | null;
  originalMonthlyPrice?: number | null;
  monthlyPrice: number;
  originalAnnualPrice?: number | null;
  annualPrice: number;
  billingType?: string | null;
  creditsIncluded?: number | null;
}

interface PricingTableClientProps {
  plans: SerializedSubscriptionPlan[];
  addons?: SerializedPlanAddon[];
}

export function PricingTableClient({ plans, addons = [] }: PricingTableClientProps) {
  const [isAnnual, setIsAnnual] = React.useState(true);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  // Helper to determine plan metadata and feature checklist
  const getPlanDetails = (plan: SerializedSubscriptionPlan) => {
    const isMulti = plan.slug.includes('multi') || plan.name.toLowerCase().includes('multi');
    const isHigher = plan.slug.includes('higher') || plan.slug.includes('franchise') || plan.name.toLowerCase().includes('higher');

    let badge: string | null = plan.offerBadgeText || null;
    let isRecommended = false;
    let tagline = 'Ideal for independent photographers and boutique single-shooter setups.';

    if (isMulti) {
      if (!badge) badge = 'Most Popular';
      isRecommended = true;
      tagline = 'For established wedding & event studios managing up to 3 branches.';
    } else if (isHigher) {
      if (!badge) badge = 'All Features Inbuilt';
      tagline = 'For production houses and franchise networks with up to 5 locations.';
    } else if (plan.isBasePlan && !badge) {
      badge = 'Base Plan';
    }

    const featureItems: string[] = [
      'Full Core CRM & ERP (Leads, Bookings, Crew, GST Invoices, Expenses)',
      `${plan.maxBranches} Studio Branch${plan.maxBranches > 1 ? 'es' : ''} (Strict Limit)`,
      `${plan.maxStaff} In-House Login Staff (Strict Limit)`,
      'Unlimited Non-Login Freelancers (External Crew)',
      'Client Proofing & Selection Portal',
    ];

    if (isHigher || (plan.includedAddons && plan.includedAddons.includes('AI_FACE_RECOGNITION'))) {
      featureItems.push('✨ AI Face Recognition for All Events (Inbuilt ₹0)');
      featureItems.push('✨ Customer Database Broadcast Messaging (Inbuilt ₹0)');
    }

    return { badge, isRecommended, tagline, features: featureItems };
  };

  const faqs = [
    {
      question: 'How does the 15-day free trial work?',
      answer:
        'You receive full, unrestricted access to FRAMIQ immediately after registering your studio. No credit card or upfront deposit is required. You can test shoot scheduling, crew dispatch, client proofing, and GST invoicing.',
    },
    {
      question: 'What is the Base Plan and how do add-ons work?',
      answer:
        'Our Starter Studio plan serves as the comprehensive Base Plan. If you only need one or two advanced capabilities (such as Google Drive BYOS sync or Meta Lead Ads auto-import), you do not need to upgrade to a higher tier—you can simply attach standalone add-ons at modular rates.',
    },
    {
      question: 'Can I provide my GSTIN to claim Input Tax Credit (ITC)?',
      answer:
        'Yes. FRAMIQ by Pratima Entertainment & Technology is 100% compliant with Indian GST requirements. You can enter your studio GSTIN during signup or in Studio Settings, and all subscription tax invoices will include valid B2B ITC details.',
    },
    {
      question: 'What happens to my client galleries and data after the trial?',
      answer:
        'All your leads, events, client photos, approval locks, and invoices remain intact. Once you activate your subscription, your account transitions seamlessly without any downtime or data migration needed.',
    },
    {
      question: 'Can I change my plan or billing cycle later?',
      answer:
        'Yes. You can upgrade, downgrade, or switch between Monthly and Annual billing anytime directly from your Studio Settings. Plan upgrades take effect immediately.',
    },
    {
      question: 'Which payment methods do you support in India?',
      answer:
        'We support UPI (Google Pay, PhonePe, Paytm, BHIM), Indian & International Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking via Razorpay secure checkout.',
    },
  ];

  return (
    <div className="space-y-16">
            {/* Full Core CRM & ERP Guaranteed Value Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 text-center space-y-1.5 shadow-xs max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
          <Sparkles className="h-4 w-4" />
          <span>Full Core CRM &amp; ERP Included in Every Plan</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
          No feature locks on essential daily workflows. Complete Leads, Quotations, Bookings, Crew &amp; Gear Dispatch, Invoicing, Expenses, and Basic Client Portals are standard across all tiers. You only pay for branch scale and variable-cost capabilities.
        </p>
      </div>

      {/* Billing Switcher (Monthly vs Annual) */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <span
            className={cn(
              'text-sm font-medium transition-colors cursor-pointer',
              !isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnnual(false)}
          >
            Monthly Billing
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual billing discount"
            onClick={() => setIsAnnual((prev) => !prev)}
            className={cn(
              'relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isAnnual ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                isAnnual ? 'translate-x-6' : 'translate-x-0'
              )}
            />
          </button>

          <span
            className={cn(
              'text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5',
              isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnnual(true)}
          >
            Annual Billing
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold"
            >
              Save ~17%
            </Badge>
          </span>
        </div>
      </div>

      {/* Dynamic Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const { badge, isRecommended, tagline, features } = getPlanDetails(plan);
          const effectiveMonthly = isAnnual
            ? Math.round(plan.annualPrice / 12)
            : plan.monthlyPrice;
          const billingCycle = isAnnual ? 'ANNUAL' : 'MONTHLY';

          const effectiveOriginalMonthly = isAnnual
            ? plan.originalAnnualPrice
              ? Math.round(plan.originalAnnualPrice / 12)
              : null
            : plan.originalMonthlyPrice || null;

          const discountPct =
            effectiveOriginalMonthly && effectiveOriginalMonthly > effectiveMonthly
              ? Math.round(((effectiveOriginalMonthly - effectiveMonthly) / effectiveOriginalMonthly) * 100)
              : 0;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-2xl border p-7 sm:p-8 transition-all bg-card/60 backdrop-blur-xs',
                isRecommended
                  ? 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/20 bg-card'
                  : 'border-border/70 hover:border-border shadow-xs',
                plan.isBasePlan && !isRecommended && 'border-emerald-500/60 ring-1 ring-emerald-500/30'
              )}
            >
              {/* Badge: Recommended, Base Plan, or Custom Offer */}
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge
                    className={cn(
                      'font-bold px-3 py-1 shadow-sm text-xs',
                      isRecommended
                        ? 'bg-primary text-primary-foreground'
                        : plan.isBasePlan
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    )}
                  >
                    {plan.isBasePlan && <Star className="h-3 w-3 fill-current inline mr-1" />}
                    {badge}
                  </Badge>
                </div>
              )}

              <div className="space-y-6">
                {/* Plan Name & Tagline */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold font-heading text-foreground">
                      {plan.name}
                    </h3>
                    {plan.isBasePlan && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                        Base Plan
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tagline}
                  </p>
                </div>

                {/* Price Display with Strikethrough MRP */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-baseline gap-2">
                    {effectiveOriginalMonthly && effectiveOriginalMonthly > effectiveMonthly && (
                      <span className="text-lg line-through text-muted-foreground font-semibold">
                        ₹{effectiveOriginalMonthly.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-3xl sm:text-4xl font-black text-foreground font-heading">
                      ₹{effectiveMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      / month
                    </span>
                    {discountPct > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold"
                      >
                        {discountPct}% OFF
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isAnnual ? (
                      <>
                        Billed annually at{' '}
                        {plan.originalAnnualPrice && plan.originalAnnualPrice > plan.annualPrice && (
                          <span className="line-through mr-1 text-muted-foreground">
                            ₹{plan.originalAnnualPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                        <strong className="text-foreground">₹{plan.annualPrice.toLocaleString('en-IN')}</strong> + GST
                      </>
                    ) : (
                      'Billed monthly + GST'
                    )}
                  </p>
                </div>

                {/* Plan Quotas Highlights */}
                <div className="grid grid-cols-2 gap-2 pt-2 pb-1 border-y border-border/40 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{plan.maxBranches} {plan.maxBranches === 1 ? 'Branch' : 'Branches'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{plan.maxStaff} Staff Logins</span>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Included in this plan:
                  </p>
                  <ul className="space-y-2.5">
                    {features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-muted-foreground"
                      >
                        <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                <Link
                  href={`/signup?planId=${plan.id}&cycle=${billingCycle}`}
                  className={cn(
                    buttonVariants({
                      variant: isRecommended ? 'default' : 'outline',
                      size: 'lg',
                    }),
                    'w-full font-bold text-xs gap-2 shadow-xs'
                  )}
                >
                  <span>Start 15-Day Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  No credit card required • Instant studio setup
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modular Optional Add-ons Price List Section */}
      {addons.length > 0 && (
        <div className="pt-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Modular SaaS Add-on Catalog</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              Optional Add-on Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Need specific superpowers without jumping to an Enterprise tier? Start on our Base Plan and attach any individual add-on at transparent, pay-as-you-grow pricing.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Capability Module</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">What It Unlocks</th>
                    <th className="py-3.5 px-4 text-center">Billing Model</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Pricing (MRP / Offer)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {addons.map((addon) => {
                    const origM = addon.originalMonthlyPrice;
                    const curM = addon.monthlyPrice;
                    const origA = addon.originalAnnualPrice;
                    const curA = addon.annualPrice;

                    return (
                      <tr key={addon.featureKey} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                            {addon.name}
                          </div>
                          <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {addon.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell text-muted-foreground">
                          {addon.description || 'Enterprise modular add-on capability.'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {addon.billingType === 'PER_EVENT' ? (
                            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                              Pay-Per-Event (1 Credit)
                            </Badge>
                          ) : addon.billingType === 'CREDIT_PACK' ? (
                            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px]">
                              Prepaid Pack ({addon.creditsIncluded || 10} Credits)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                              Monthly / Annual Add-on
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono">
                          {addon.billingType === 'PER_EVENT' || addon.billingType === 'CREDIT_PACK' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {origM && origM > curM && (
                                <span className="text-muted-foreground line-through text-[11px]">
                                  ₹{origM.toLocaleString('en-IN')}
                                </span>
                              )}
                              <span className="font-bold text-foreground text-sm">
                                ₹{curM.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">one-time</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1.5">
                                {origM && origM > curM && (
                                  <span className="text-muted-foreground line-through text-[11px]">
                                    ₹{origM.toLocaleString('en-IN')}
                                  </span>
                                )}
                                <span className="font-bold text-foreground">
                                  ₹{curM.toLocaleString('en-IN')}/mo
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                or ₹{curA.toLocaleString('en-IN')}/yr
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-muted/20 border-t border-border/60 text-center text-xs text-muted-foreground">
              💡 Add-ons can be enabled directly during subscription checkout or assigned anytime via your studio billing desk.
            </div>
          </div>
        </div>
      )}

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Have questions about billing, quotas, or GST invoicing? We have answers.
          </p>
        </div>

        <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/40 overflow-hidden">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="transition-colors hover:bg-muted/10">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground transition-all"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-180 text-primary'
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
