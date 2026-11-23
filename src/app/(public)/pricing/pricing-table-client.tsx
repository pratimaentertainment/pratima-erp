'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  Users,
  MessageSquare,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SerializedSubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  maxBranches: number;
  maxStaff: number;
  smsCredits: number;
  whatsappCredits: number;
}

interface PricingTableClientProps {
  plans: SerializedSubscriptionPlan[];
}

export function PricingTableClient({ plans }: PricingTableClientProps) {
  const [isAnnual, setIsAnnual] = React.useState(true);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  // Helper to determine plan metadata and feature checklist
  const getPlanDetails = (plan: SerializedSubscriptionPlan) => {
    const isPro = plan.slug.includes('pro') || plan.name.toLowerCase().includes('pro');
    const isEnterprise = plan.slug.includes('enterprise') || plan.name.toLowerCase().includes('enterprise');

    let badge: string | null = null;
    let isRecommended = false;
    let tagline = 'Ideal for independent photographers and boutique single-shooter setups.';

    if (isPro) {
      badge = 'Most Popular';
      isRecommended = true;
      tagline = 'For established wedding & event studios managing multiple teams and shoots.';
    } else if (isEnterprise) {
      badge = 'Enterprise Grade';
      tagline = 'For high-end production houses, franchises, and large cinema studios.';
    }

    const features: string[] = [
      plan.maxBranches === 1 ? '1 Studio Location' : `Up to ${plan.maxBranches} Studio Branches`,
      `Up to ${plan.maxStaff} Staff & Crew Accounts`,
      `${plan.smsCredits.toLocaleString('en-IN')} Transactional SMS Credits`,
      `${plan.whatsappCredits.toLocaleString('en-IN')} WhatsApp Cloud API Credits`,
      'GST-Compliant Quotations & Tax Invoices',
      'Shoot Calendar & Crew Rostering',
    ];

    if (isPro || isEnterprise) {
      features.push('Watermarked Photo Selection & Proofing Portal');
      features.push('Auto WhatsApp Payment & Shoot Reminders');
      features.push('Camera & Gear Inventory Maintenance Tracking');
    }

    if (isEnterprise) {
      features.push('Double-Entry Accounting & Financial Ledgers');
      features.push('Shoot Profit & Loss Margin Analytics');
      features.push('Dedicated VIP Onboarding & Priority Support');
    }

    return { badge, isRecommended, tagline, features };
  };

  const faqs = [
    {
      question: 'How does the 15-day free trial work?',
      answer:
        'You receive full, unrestricted access to Pratima ERP immediately after registering your studio. No credit card or upfront deposit is required. You can test real shoot scheduling, client proofing, WhatsApp automations, and GST invoicing.',
    },
    {
      question: 'Can I provide my GSTIN to claim Input Tax Credit (ITC)?',
      answer:
        'Yes. Pratima ERP is 100% compliant with Indian GST requirements. You can enter your studio GSTIN during signup or in Studio Settings, and all subscription tax invoices will include valid B2B ITC details.',
    },
    {
      question: 'What happens to my client galleries and data after the trial?',
      answer:
        'All your leads, events, client photos, approval locks, and invoices remain intact. Once you activate your subscription, your account transitions without any downtime or data migration needed.',
    },
    {
      question: 'Can I change my plan or billing cycle later?',
      answer:
        'Yes. You can upgrade, downgrade, or switch between Monthly and Annual billing anytime directly from your Studio Settings. Plan upgrades are prorated automatically.',
    },
    {
      question: 'Are there any hidden server setup or onboarding fees?',
      answer:
        'None whatsoever. The pricing displayed above covers cloud infrastructure, database isolation, regular updates, and support. There are zero hidden fees.',
    },
    {
      question: 'Which payment methods do you support in India?',
      answer:
        'We support UPI (Google Pay, PhonePe, Paytm, BHIM), Indian & International Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking via Razorpay/Cashfree secure gateways.',
    },
  ];

  return (
    <div className="space-y-16">
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

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-2xl border p-7 sm:p-8 transition-all bg-card/60 backdrop-blur-xs',
                isRecommended
                  ? 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/20 bg-card'
                  : 'border-border/70 hover:border-border shadow-xs'
              )}
            >
              {/* Recommended / Popular Badge */}
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 shadow-sm text-xs">
                    {badge}
                  </Badge>
                </div>
              )}

              <div className="space-y-6">
                {/* Plan Name & Tagline */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-heading text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-foreground font-heading">
                      ₹{effectiveMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      / month
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isAnnual
                      ? `Billed annually at ₹${plan.annualPrice.toLocaleString('en-IN')} + GST`
                      : 'Billed monthly + GST'}
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
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{plan.smsCredits} SMS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{plan.whatsappCredits} WhatsApp</span>
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
                        <span>{feature}</span>
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
                    'w-full font-semibold shadow-xs gap-2'
                  )}
                >
                  <span>Start 15-Day Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[10px] text-muted-foreground mt-2">
                  15 days free • No card required • Instant setup
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Enterprise Pillars */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 sm:p-8" id="features">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mx-auto md:mx-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Bank-Grade Multi-Tenant Cloud</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each studio receives isolated database boundaries with encrypted tokens and strict RBAC controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mx-auto md:mx-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">WhatsApp Cloud Automation</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send interactive wedding quotations, shoot reminders, and payment receipts straight to WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mx-auto md:mx-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">100% Indian GST Ready</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-calculate CGST, SGST, IGST with SAC codes, reverse charge handling, and GSTR-1 compliant exports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-8" id="faq">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Everything you need to know about plans, billing, and onboarding your photography studio.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-border/70 overflow-hidden bg-card/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-sm text-foreground hover:bg-muted/30 transition-colors"
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
                  <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="rounded-3xl bg-linear-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-8 sm:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight">
            Ready to scale your photography studio?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Join hundreds of wedding and commercial photography studios across India. Start your 15-day free trial in under 2 minutes.
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto font-bold px-8 shadow-md')}
          >
            <span>Start 15-Day Free Trial</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'w-full sm:w-auto bg-transparent border-zinc-700 text-white hover:bg-zinc-800'
            )}
          >
            Studio Login
          </Link>
        </div>
      </div>
    </div>
  );
}
