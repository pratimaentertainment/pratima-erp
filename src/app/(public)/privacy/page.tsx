import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, ArrowLeft, Database, KeyRound, Mail, Phone, MapPin, UserCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy Policy | FRAMIQ by Pratima Entertainment & Technology',
  description:
    'Learn how FRAMIQ (operated by Pratima Entertainment & Technology) safeguards studio and client data under Indian DPDPA 2023.',
};

export default function PrivacyPage() {
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              <span>Data Protection &amp; Indian DPDPA 2023 Compliance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At <strong>FRAMIQ</strong> (owned and operated by <strong>Pratima Entertainment &amp; Technology</strong>), we respect your privacy and recognize that client event photographs, shoot schedules, and studio financial ledgers are confidential creative and business assets. This Privacy Policy outlines our transparent data handling principles.
            </p>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Lock className="h-4 w-4 text-primary" />
              <span>Zero Creative Monetization</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              We never sell, analyze for AI models, or share your studio&apos;s photos, client leads, or financial data with third parties.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Database className="h-4 w-4 text-emerald-500" />
              <span>Strict Multi-Tenant Isolation</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Every photography studio operates in an isolated tenant partition with strict relational database boundaries.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <KeyRound className="h-4 w-4 text-amber-500" />
              <span>Bank-Grade Encryption</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              All communications are encrypted in transit via TLS 1.3 and at rest using AES-256 cloud encryption.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">1. Corporate Identity &amp; Data Controller</h2>
            <p>
              The data controller responsible for the processing of your personal and business data within the <strong>FRAMIQ</strong> platform is:
            </p>
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1 text-xs">
              <p className="font-bold text-foreground">Pratima Entertainment &amp; Technology (Established 2008)</p>
              <p className="text-muted-foreground">Proprietor: {siteConfig.founder}</p>
              <p className="text-muted-foreground">Registered Address: {siteConfig.address}</p>
              <p className="text-muted-foreground">Contact Email: <a href={`mailto:${siteConfig.email}`} className="text-primary hover:underline">{siteConfig.email}</a></p>
              <p className="text-muted-foreground">Contact Phone: <a href={`tel:${siteConfig.phone}`} className="text-primary hover:underline">{siteConfig.phoneFormatted}</a></p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">2. Information We Collect</h2>
            <p>To provide and maintain the FRAMIQ ERP service, we collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Studio Account &amp; Billing Data:</strong> Studio trade name, owner full name, 10-digit mobile phone number, email address, physical studio address, and GSTIN (for B2B tax invoice generation).
              </li>
              <li>
                <strong>Customer CRM &amp; Event Details:</strong> Client names, event dates (weddings, portraits, commercial shoots), venue locations, quotation line items, and invoice payment milestones entered by your studio.
              </li>
              <li>
                <strong>Photographic Media &amp; Selection Logs:</strong> Compressed JPEG/PNG images uploaded by your studio for client digital proofing, selection flags, color tags, client comments, and album approval timestamps.
              </li>
              <li>
                <strong>Technical &amp; Security Logs:</strong> IP addresses, browser user-agent strings, session identifiers, and audit trail logs required for fraud prevention and system security.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">3. Razorpay Payment Security (PCI-DSS)</h2>
            <p>
              All online subscription transactions for FRAMIQ are processed via our authorized payment partner, <strong>Razorpay</strong>, which is certified as a PCI-DSS Level 1 service provider (the highest security tier in the payments industry).
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>FRAMIQ never stores, collects, or logs raw credit card numbers, debit card PINs, or CVV codes on our servers.</li>
              <li>Payment details are encrypted and transmitted directly to Razorpay through secure, bank-grade tokenization.</li>
              <li>We only retain transaction reference identifiers (Razorpay Order ID and Payment ID), transaction timestamps, and GST tax invoice records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">4. Bring-Your-Own-Storage (BYOS) &amp; Cloud Partners</h2>
            <p>
              FRAMIQ enables studios to connect their own cloud vaults (such as Amazon Web Services S3 or Google Drive). In all storage operations:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your cloud credentials (API keys and access secrets) are encrypted and stored in secure, restricted database fields.</li>
              <li>Files stored in your BYOS buckets remain 100% under your direct ownership and control.</li>
              <li>Client proofing portals access photo previews via signed, time-limited expiring URLs to prevent unauthorized hotlinking.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">5. How We Use Collected Data</h2>
            <p>We use collected data solely for legitimate business and operational purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authenticating users, studio staff, and client portal visitors.</li>
              <li>Generating professional PDF quotations, shoot call sheets, and GST tax invoices.</li>
              <li>Delivering automated WhatsApp, SMS, or email notifications for shoot updates and payment reminders upon studio configuration.</li>
              <li>Maintaining system health, performance telemetry, and platform uptime.</li>
              <li>Complying with statutory accounting and tax retention regulations under Indian law.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">6. Data Retention &amp; Studio Deletion Rights</h2>
            <p>
              We retain your studio operational records for the duration of your active subscription or trial. If you cancel your subscription or request account termination:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You may export your client lists, quotations, and accounting ledgers prior to termination.</li>
              <li>Platform-hosted temporary proofing images will be queued for permanent deletion within thirty (30) days following termination.</li>
              <li>Statutory tax invoices and payment ledger records will be retained as required under Indian GST legislation.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">7. Rights Under the Digital Personal Data Protection Act, 2023 (DPDPA)</h2>
            <p>
              In accordance with Indian law, you have the right to request access to, correction of, or erasure of your personal data held by us. You may exercise these rights or withdraw consent by writing to our designated Grievance Officer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">8. Designated Grievance Officer</h2>
            <p>
              In compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the contact details of our Grievance Officer are:
            </p>
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>Grievance Officer: {siteConfig.founder}</span>
              </div>
              <p className="text-muted-foreground">Entity: <strong>Pratima Entertainment &amp; Technology</strong></p>
              <div className="space-y-1 pt-1 text-muted-foreground">
                <p>Address: {siteConfig.address}</p>
                <p>Email: <a href={`mailto:${siteConfig.email}`} className="text-primary font-medium hover:underline">{siteConfig.email}</a></p>
                <p>Phone / WhatsApp: <a href={`tel:${siteConfig.phone}`} className="text-primary font-medium hover:underline">{siteConfig.phoneFormatted}</a></p>
                <p>Support Hours: {siteConfig.supportHours}</p>
                <p>Jurisdiction: {siteConfig.jurisdiction}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
