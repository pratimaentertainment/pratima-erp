import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Eye, ArrowLeft, Database, KeyRound } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Privacy Policy | Pratima ERP',
  description: 'Learn how Pratima ERP protects your studio, client data, and photographs with bank-grade encryption.',
};

export default function PrivacyPage() {
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              <span>Data Protection &amp; Security</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Pratima ERP, we understand that client photographs, event schedules, and financial records are the lifeblood of your photography studio. We are committed to safeguarding your privacy and ensuring transparency in our data processing practices.
            </p>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Lock className="h-4 w-4 text-primary" />
              <span>Zero Content Monetization</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              We never sell your studio data, photos, or client leads to advertisers or third parties.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Database className="h-4 w-4 text-emerald-500" />
              <span>Isolated Tenant Silos</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Each studio operates in a strictly scoped multi-tenant partition with encrypted schema guards.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <KeyRound className="h-4 w-4 text-amber-500" />
              <span>AES-256 Cloud Encryption</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Photos, proofing galleries, and invoices are encrypted both in transit (TLS 1.3) and at rest.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">1. Information We Collect</h2>
            <p>We collect information in the following categories to provide and enhance the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Studio &amp; Owner Profile:</strong> Name, studio/brand name, email address, 10-digit mobile phone number, encrypted passwords, studio address, GSTIN, and PAN (for business verification).
              </li>
              <li>
                <strong>Client &amp; CRM Data:</strong> Contact details of your clients, event dates (weddings, birthdays, corporate events), quotation line items, and invoice payment milestones entered by you or your staff.
              </li>
              <li>
                <strong>Photographic Media &amp; Metadata:</strong> JPEG/PNG preview images uploaded for client proofing, album selections, comments, approval records, and image dimensions/EXIF metadata.
              </li>
              <li>
                <strong>Technical Usage Logs:</strong> IP addresses, browser user-agents, login timestamps, device fingerprints, and application telemetry required for intrusion prevention and security monitoring.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">2. How We Use Your Information</h2>
            <p>We process collected data exclusively for valid operational and business objectives, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authenticating studio owners, staff members, and clients accessing proofing links.</li>
              <li>Facilitating automated quotation, GST invoice generation, and financial accounting.</li>
              <li>Powering real-time notifications via WhatsApp, SMS, and Email for shoot schedules and payment reminders.</li>
              <li>Rendering high-speed watermarked galleries for client photo selection.</li>
              <li>Detecting fraudulent signups, duplicate accounts, and unauthorized intrusions.</li>
              <li>Complying with statutory tax retention requirements under Indian law (GST &amp; Income Tax Acts).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">3. Data Sharing &amp; Third-Party Sub-Processors</h2>
            <p>
              We partner with trusted enterprise infrastructure providers to operate the Platform. We ensure all sub-processors adhere to strict data protection standards:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Cloud Storage &amp; Database:</strong> AWS (Amazon Web Services) / Supabase / Neon PostgreSQL (ISO 27001, SOC 2 compliant, encrypted at rest).
              </li>
              <li>
                <strong>Payment Gateways:</strong> Razorpay / Cashfree (PCI-DSS Level 1 compliant; we do not store raw credit card numbers or CVVs on our servers).
              </li>
              <li>
                <strong>Communication Channels:</strong> Meta WhatsApp Cloud API / Twilio for verified transactional messaging.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">4. Storage Security &amp; Client Gallery Privacy</h2>
            <p>
              Client photo proofing galleries are private by default. Access is protected by unique, non-guessable cryptographic tokens and optional PIN codes set by the studio.
            </p>
            <p>
              Watermarks configured by your studio are rendered server-side or dynamically composited to discourage unauthorized downloads before client approvals and final invoice settlements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">5. Data Retention &amp; Deletion</h2>
            <p>
              We retain your studio operational records for the duration of your active subscription. If you cancel your subscription or request account deletion:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your uploaded gallery preview images will be scheduled for permanent deletion within 30 days following subscription termination.</li>
              <li>You may request an export of your client database, inquiry logs, and accounting reports before account closure.</li>
              <li>Statutory financial invoices and tax audit trail logs may be retained as mandated by Indian GST compliance regulations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">6. Your Rights under Indian DPDPA 2023</h2>
            <p>
              Under the Digital Personal Data Protection Act, 2023, you and your authorized staff have the right to access, review, correct, or request the erasure of personal information held by us. To exercise any of these rights, please write to our Grievance Officer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">7. Grievance Officer &amp; Inquiries</h2>
            <p>
              In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the details of the Grievance Officer are provided below:
            </p>
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1 text-xs">
              <p className="font-semibold text-foreground">Grievance Officer: Pratima Data Protection Desk</p>
              <p>Email: privacy@pratimaerp.com</p>
              <p>Company: Pratima Entertainment &amp; Technologies</p>
              <p>Location: Pune, Maharashtra - 411038, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
