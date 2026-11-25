import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileText, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of Service | FRAMIQ by Pratima Entertainment & Technology',
  description:
    'Terms and Conditions governing the use of FRAMIQ Photography Studio ERP SaaS, owned and operated by Pratima Entertainment & Technology.',
};

export default function TermsPage() {
  const lastUpdated = 'November 25, 2026';

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
              <span>Official SaaS Terms &amp; Conditions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer&rdquo;, &ldquo;Studio Owner&rdquo;, &ldquo;User&rdquo;) and <strong>Pratima Entertainment &amp; Technology</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), establishing the terms and conditions under which you may access and use the <strong>FRAMIQ</strong> cloud software application, websites, and associated services (collectively, the &ldquo;Service&rdquo; or &ldquo;FRAMIQ&rdquo;).
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">1. Corporate Entity &amp; Acceptance of Terms</h2>
            <p>
              <strong>FRAMIQ</strong> is a proprietary software-as-a-service (SaaS) product exclusively owned, engineered, and operated by <strong>Pratima Entertainment &amp; Technology</strong>, a registered business enterprise established in 2008 with headquarters at Near Old Water Tank, Tardal Road, Khotwadi, Dist. Kolhapur, Maharashtra, India.
            </p>
            <p>
              By accessing, browsing, registering an account on FRAMIQ, or clicking &ldquo;I Agree&rdquo;, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are entering into this agreement on behalf of a photography studio, media agency, or company, you represent that you have legal authority to bind such entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">2. Account Registration &amp; Tenant Workspace Security</h2>
            <p>
              To access FRAMIQ, you must register a photography studio workspace by providing accurate and complete business information, including your full legal name, studio brand name, active 10-digit Indian mobile number, and valid email address.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Tenant Isolation:</strong> Each registered photography studio is allocated an isolated multi-tenant partition with encrypted schema guards.
              </li>
              <li>
                <strong>Credential Security:</strong> You are strictly responsible for maintaining the confidentiality of your login credentials and for all actions conducted under your studio workspace.
              </li>
              <li>
                <strong>Staff &amp; Crew Logins:</strong> Studio owners can invite team members, freelance cinematographers, and photo editors. The studio owner remains directly responsible for all activities conducted by invited staff.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">3. 15-Day Free Trial, Subscription Billing &amp; Taxes</h2>
            <p>
              <strong>15-Day Free Trial:</strong> New studios receive a 15-day complimentary trial period upon registration to test shoot scheduling, crew dispatch, client proofing galleries, and invoicing. No credit card or upfront deposit is required.
            </p>
            <p>
              <strong>Subscription Billing:</strong> Continued access following your trial requires an active paid subscription plan (Starter, Pro, Enterprise, or modular add-ons). All fees are quoted and billed in Indian Rupees (INR) on a recurring monthly or annual basis via authorized payment gateways (including <strong>Razorpay</strong>).
            </p>
            <p>
              <strong>Goods and Services Tax (GST):</strong> Applicable GST (currently 18%) is levied on all subscription invoices in compliance with Indian tax legislation. Registered businesses can input their valid GSTIN during signup or in Studio Settings to claim Input Tax Credit (ITC).
            </p>
            <p>
              <strong>Cancellation &amp; Refunds:</strong> Subscriptions may be cancelled at any time before the subsequent billing renewal. Detailed terms regarding cancellations, refunds, and technical charge errors are governed by our separate <Link href="/refund-policy" className="text-primary underline">Refund &amp; Cancellation Policy</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">4. Intellectual Property &amp; Studio Content Ownership</h2>
            <p>
              <strong>Your Studio Creative Media:</strong> You and your clients retain 100% exclusive intellectual property ownership of all photographic media, RAW image files, video footage, client contact books, event schedules, and quotation data uploaded to or created within FRAMIQ. We claim zero ownership or monetization rights over your creative assets.
            </p>
            <p>
              <strong>Platform Intellectual Property:</strong> All software code, database architecture, user interface designs, logos, algorithms, and documentation associated with FRAMIQ are the exclusive intellectual property of <strong>Pratima Entertainment &amp; Technology</strong>. You are granted a limited, non-transferable, revocable license to use the Service during your active subscription term.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">5. Fair Use, Storage &amp; BYOS Cloud Architecture</h2>
            <p>
              FRAMIQ provides seamless integrations with Bring-Your-Own-Storage (BYOS) cloud providers, including Amazon Web Services (AWS S3) and Google Drive. When utilizing platform storage or client proofing galleries:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You represent that you have obtained appropriate model and client consent to upload and display photographs.</li>
              <li>You agree to respect cloud storage allocations corresponding to your active subscription plan.</li>
              <li>You shall not upload malicious code, viruses, or unlawful material to the platform.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">6. Prohibited Activities</h2>
            <p>You agree not to engage in any of the following restricted actions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Reverse-engineering, decompiling, or attempting to extract source code from FRAMIQ.</li>
              <li>Bypassing or attempting to circumvent tenant isolation, access controls, or feature lock mechanisms.</li>
              <li>Using automated bots, crawlers, or excessive API requests that degrade platform infrastructure.</li>
              <li>Utilizing integrated WhatsApp or email services for sending unsolicited spam or deceptive marketing.</li>
              <li>Reselling, sublicensing, or white-labeling the Service without prior written authorization from Pratima Entertainment &amp; Technology.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">7. Service Availability &amp; Maintenance</h2>
            <p>
              We strive to maintain high service availability (99.9% uptime target). However, temporary downtime may occur due to essential maintenance, cloud provider infrastructure events, or emergency security updates. We will make reasonable efforts to provide advance notice for scheduled maintenance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permissible by applicable law, in no event shall <strong>Pratima Entertainment &amp; Technology</strong>, its proprietor, employees, or partners be liable for any indirect, incidental, punitive, or consequential damages (including loss of profits, shoot delays, or business interruption) arising out of the use or inability to use the Service.
            </p>
            <p>
              Our aggregate liability for any direct claim arising from these Terms or the Service shall not exceed the total subscription fees actually paid by you to Pratima Entertainment &amp; Technology in the three (3) months preceding the incident.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">9. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms shall be governed by, interpreted, and construed in accordance with the substantive laws of the Republic of India. Any legal dispute, controversy, or claim arising out of or in connection with these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts located in <strong>Kolhapur, Maharashtra, India</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">10. Corporate Legal &amp; Support Contact</h2>
            <p>
              For legal inquiries, copyright notices, or questions regarding these Terms, please contact our legal desk:
            </p>
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
              <p className="font-bold text-foreground text-sm">Pratima Entertainment &amp; Technology</p>
              <p className="text-muted-foreground">Operator of FRAMIQ Cloud SaaS</p>
              <div className="space-y-1 pt-1 text-muted-foreground">
                <p>Proprietor: <strong>{siteConfig.founder}</strong></p>
                <p>Address: {siteConfig.address}</p>
                <p>Official Email: <a href={`mailto:${siteConfig.email}`} className="text-primary font-medium hover:underline">{siteConfig.email}</a></p>
                <p>Phone / WhatsApp: <a href={`tel:${siteConfig.phone}`} className="text-primary font-medium hover:underline">{siteConfig.phoneFormatted}</a></p>
                <p>Support Hours: {siteConfig.supportHours}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
