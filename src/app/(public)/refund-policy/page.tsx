import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, ShieldCheck, ArrowLeft, Mail, Phone, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | FRAMIQ by Pratima Entertainment & Technology',
  description:
    'Clear, transparent cancellation and refund guidelines for FRAMIQ SaaS subscriptions, operated by Pratima Entertainment & Technology.',
};

export default function RefundPolicyPage() {
  const lastUpdated = 'November 25, 2026';

  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Navigation & Header */}
        <div className="space-y-4 border-b border-border/60 pb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                '-ml-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Pricing</span>
            </Link>
            <span className="text-xs text-muted-foreground font-mono">
              Last updated: {lastUpdated}
            </span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Billing Transparency &amp; Razorpay Compliance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At <strong>FRAMIQ</strong> (owned and operated by <strong>Pratima Entertainment &amp; Technology</strong>, Est. 2008), we believe in transparent, upfront, and fair commercial practices. This policy details how cancellations, subscription modifications, and refund requests are handled.
            </p>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>15-Day Free Trial</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Every studio tests all core features for 15 days with zero upfront payment or credit card required.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Clock className="h-4 w-4 text-primary" />
              <span>Cancel Anytime</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Cancel your subscription at any time before the next billing cycle directly from Studio Settings.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <span>Duplicate Charge Protection</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Technical duplicate debits are refunded within 5–7 business days directly to your source account.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">1. 15-Day Complimentary Free Trial</h2>
            <p>
              To ensure that FRAMIQ is the right fit for your photography business, we provide a <strong>15-day unrestricted free trial</strong> upon account registration.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>No credit card, debit card, or upfront bank authorization is required to activate the trial.</li>
              <li>You can test lead intake, shoot calendar scheduling, crew dispatch sheets, client photo proofing, and quotation drafting with full feature access.</li>
              <li>If you decide not to continue, you will not be charged anything upon trial expiration.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">2. Subscription Cancellation Rules</h2>
            <p>
              You may cancel your FRAMIQ subscription at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Self-Service Cancellation:</strong> Navigate to <code>Studio Settings &gt; Billing &amp; Subscriptions</code> and select &ldquo;Cancel Subscription&rdquo;. Alternatively, you can email our billing support desk at <a href={`mailto:${siteConfig.email}`} className="text-primary hover:underline">{siteConfig.email}</a>.
              </li>
              <li>
                <strong>Retained Access Through End of Cycle:</strong> When you cancel, your subscription will remain active until the end of your current paid billing period (monthly or annual). You will not be billed for subsequent billing cycles.
              </li>
              <li>
                <strong>No Cancellation Fees:</strong> There are zero penalty fees or hidden charges for cancelling your subscription.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">3. Refund Policy &amp; Eligible Exceptions</h2>
            <p>
              As FRAMIQ is cloud-based software provided as an immediate online service with a 15-day risk-free trial prior to billing, regular subscription payments once billed are generally non-refundable. However, we honor full refunds under the following legitimate circumstances:
            </p>
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <p className="font-semibold text-foreground text-xs">A. Duplicate or Erroneous Debits</p>
                <p className="text-xs text-muted-foreground">
                  If your payment method was charged multiple times for the same billing cycle due to a technical network timeout or gateway glitch, the duplicate transaction will be refunded in full.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <p className="font-semibold text-foreground text-xs">B. Technical Processing Failures</p>
                <p className="text-xs text-muted-foreground">
                  If your account was billed but our system failed to activate or renew your subscription tier within 48 hours, and our support team was unable to resolve the issue, you are entitled to a full refund.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <p className="font-semibold text-foreground text-xs">C. Unauthorized Fraudulent Charges</p>
                <p className="text-xs text-muted-foreground">
                  If a fraudulent transaction was processed without the cardholder&apos;s authorization and reported to us within seven (7) calendar days of the debit, we will promptly investigate and process a refund.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">4. Refund Timeline &amp; Original Payment Method</h2>
            <p>
              All approved refunds are initiated through our payment gateway (<strong>Razorpay</strong>) directly to the original payment source (UPI, Credit/Debit Card, or Net Banking account) used during checkout:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Processing Window:</strong> Once approved by our finance desk, refunds are typically credited to your bank account within <strong>5 to 7 business days</strong> (depending on your issuing bank&apos;s settlement schedule).</li>
              <li><strong>GST Handling:</strong> Where a refund is issued, a corresponding Credit Note is issued in compliance with Indian GST regulations.</li>
              <li><strong>Zero Cash / Third-Party Refunds:</strong> In adherence with anti-money laundering regulations and payment gateway mandates, refunds can never be paid to third-party bank accounts or as physical cash.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">5. How to Submit a Refund Request</h2>
            <p>
              To request a refund for an eligible transaction, please contact our billing desk with your payment details:
            </p>
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
              <p className="font-bold text-foreground text-sm">Billing &amp; Refund Help Desk</p>
              <p className="text-muted-foreground">Please include your Studio Name, Registered Email, and Razorpay Payment ID (e.g., <code>pay_xxx</code>):</p>
              <div className="space-y-1 pt-1 text-muted-foreground">
                <p>Email: <a href={`mailto:${siteConfig.email}?subject=Refund%20Request%20-%20FRAMIQ`} className="text-primary font-medium hover:underline">{siteConfig.email}</a></p>
                <p>Phone / WhatsApp: <a href={`tel:${siteConfig.phone}`} className="text-primary font-medium hover:underline">{siteConfig.phoneFormatted}</a></p>
                <p>Support Hours: {siteConfig.supportHours}</p>
                <p>Corporate Office: <strong>Pratima Entertainment &amp; Technology</strong>, {siteConfig.address}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
