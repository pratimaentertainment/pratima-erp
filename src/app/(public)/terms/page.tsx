import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileText, ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Terms of Service | Pratima ERP',
  description: 'Terms and Conditions governing the use of Pratima ERP SaaS platform and services.',
};

export default function TermsPage() {
  const lastUpdated = 'September 20, 2026';

  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Navigation & Header */}
        <div className="space-y-4 border-b border-border/60 pb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                '-ml-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Signup</span>
            </Link>
            <span className="text-xs text-muted-foreground font-mono">
              Last updated: {lastUpdated}
            </span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <FileText className="h-3.5 w-3.5" />
              <span>Legal Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please read these Terms of Service carefully before registering or using Pratima ERP (&ldquo;Platform&rdquo;, &ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or registering an account on Pratima ERP, you (&ldquo;Studio Owner&rdquo;, &ldquo;Tenant&rdquo;, &ldquo;User&rdquo;) agree to be legally bound by these Terms of Service, our Privacy Policy, and any additional guidelines referenced herein. If you are registering on behalf of a photography studio, agency, or corporate entity, you represent and warrant that you have full legal authority to bind such entity to these Terms.
            </p>
            <p>
              If you do not agree with any part of these Terms, you must immediately refrain from creating an account or accessing the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">2. Account Registration & Tenant Security</h2>
            <p>
              To access Pratima ERP, you must complete the studio registration process by providing accurate, current, and complete business details, including your full name, studio trade name, valid 10-digit Indian mobile number, and email address.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account Responsibility:</strong> You are solely responsible for maintaining the confidentiality of your account credentials and passwords.
              </li>
              <li>
                <strong>Staff Logins:</strong> Studio Owners are responsible for all actions taken by authorized staff, editors, cinematographers, or accountants assigned accounts under their tenant workspace.
              </li>
              <li>
                <strong>Anti-Abuse Verification:</strong> We reserve the right to verify studio credentials, GST numbers, and PAN identification to prevent duplicate accounts, unauthorized reselling, or malicious activities.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">3. SaaS Subscriptions, Free Trials & Billing</h2>
            <p>
              <strong>Free Trial:</strong> New studios receive a 15-day complimentary trial period upon registration. During this period, you have access to core ERP capabilities without entering payment card information.
            </p>
            <p>
              <strong>Paid Plans & Invoicing:</strong> Following the expiration of your trial, continued access to the Platform requires an active paid subscription (Starter, Pro, or Enterprise). All subscription fees are billed in Indian Rupees (INR) and are subject to applicable Goods and Services Tax (GST).
            </p>
            <p>
              <strong>Payment Processing:</strong> Payments are processed via authorized third-party payment gateways (such as Razorpay or Cashfree). By subscribing, you authorize recurrent billing according to your selected billing frequency (monthly or annually).
            </p>
            <p>
              <strong>Refunds:</strong> Subscription fees are non-refundable once billed, except where required by applicable statutory consumer protection laws in India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">4. Intellectual Property & Content Ownership</h2>
            <p>
              <strong>Your Studio Content:</strong> You retain complete and exclusive ownership of all intellectual property rights in the photographic media, RAW images, video footage, client records, and financial invoices uploaded to or generated via Pratima ERP. We claim zero ownership rights over your creative assets.
            </p>
            <p>
              <strong>Platform IP:</strong> Pratima ERP, including all software code, interface designs, logos, databases, algorithms, and documentation, is the exclusive intellectual property of Pratima Entertainment &amp; Technologies. You are granted a non-exclusive, non-transferable, revocable license to use the Service during your valid subscription term.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">5. Client Proofing, Watermarks & Fair Storage Usage</h2>
            <p>
              When uploading photographs and albums for client selection and proofing:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                You represent that you have obtained appropriate consent from wedding couples, models, and subjects to store and display their images.
              </li>
              <li>
                Automated watermarking and image degradation tools provided by the Platform are auxiliary safeguards. We recommend uploading web-optimized JPEG previews rather than uncompressed RAW files for selection portals.
              </li>
              <li>
                Cloud storage allocations correspond to your active subscription tier. Exceeding your plan limit may require upgrading your tier or purchasing additional high-speed storage packs.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">6. Prohibited Activities</h2>
            <p>You agree not to engage in any of the following restricted activities:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Uploading content that is unlawful, defamatory, obscene, infringing, or violating individual privacy.</li>
              <li>Attempting to reverse-engineer, decompile, scrape, or extract source code from the Platform.</li>
              <li>Circumventing tenant isolation, data sandboxing, or user authentication mechanisms.</li>
              <li>Using automated scripts, bots, or excessive API requests to degrade platform performance.</li>
              <li>Using WhatsApp automation or messaging features for unsolicited spam or deceptive marketing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">7. Service Availability & Support SLA</h2>
            <p>
              We strive to maintain a 99.9% uptime across all cloud regions hosting Pratima ERP. However, service availability may be temporarily impacted by scheduled maintenance windows, emergency security patches, or third-party cloud infrastructure outages. We shall provide advance notice of scheduled maintenance whenever reasonably feasible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted under applicable law, Pratima ERP and its affiliates, directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, business interruption, or client disputes arising out of your use or inability to use the Platform.
            </p>
            <p>
              In no event shall our aggregate liability exceed the total subscription fees paid by you to Pratima ERP in the three (3) months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">9. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the substantive laws of India, without regard to conflict of law principles. Any dispute, claim, or controversy arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Pune/Mumbai, Maharashtra, India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">10. Contact Information</h2>
            <p>
              For legal inquiries, terms clarification, or copyright compliance notifications, please contact:
            </p>
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <p className="font-semibold text-foreground">Pratima ERP Legal Team</p>
              <p>Email: legal@pratimaerp.com</p>
              <p>Address: Pratima Entertainment &amp; Technologies, Pune, Maharashtra, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
