import * as React from 'react';
import Link from 'next/link';
import { Camera, ShieldCheck, Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { siteConfig } from '@/config/site';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Shared Public Top Navigation */}
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Shared Public Footer: Fully Compliant for Razorpay KYC & Studio Trust */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Column 1: Brand & Parent Entity (2 cols on lg) */}
            <div className="space-y-4 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-lg tracking-tight font-heading leading-tight">
                    FRAMIQ
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                    by Pratima Entertainment &amp; Technology
                  </span>
                </div>
              </Link>

              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                FRAMIQ is India&apos;s most advanced all-in-one Photography Studio ERP SaaS, engineered by <strong>Pratima Entertainment &amp; Technology</strong> (Established 2008). Built for wedding cinematographers, multi-branch production houses, and creative visual studios.
              </p>

              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">
                    {siteConfig.address}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>GST Registered • Razorpay Verified Merchant</span>
                </div>
              </div>
            </div>

            {/* Column 2: Product & Features */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/pricing" className="hover:text-primary transition-colors">
                    Pricing &amp; Plans
                  </Link>
                </li>
                <li>
                  <Link href="/pricing#features" className="hover:text-primary transition-colors">
                    ERP Features Matrix
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-primary transition-colors">
                    15-Day Free Trial
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary transition-colors">
                    Studio Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Razorpay KYC */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Legal &amp; Policy
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="hover:text-primary transition-colors font-medium text-foreground/80 hover:text-primary">
                    Refund &amp; Cancellation
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact &amp; Grievances
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Official Help & Support Desk */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Support Desk
              </h4>
              <p className="text-xs text-muted-foreground leading-snug">
                Need help with studio onboarding, billing, or custom plans?
              </p>
              <div className="space-y-2 text-xs text-muted-foreground pt-1">
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group"
                >
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate text-xs">{siteConfig.email}</span>
                </a>
                <a
                  href={`tel:${siteConfig.phone}`}
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{siteConfig.phoneFormatted}</span>
                </a>
                <a
                  href={siteConfig.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>WhatsApp Chat Support</span>
                </a>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Mon – Sat, 10 AM – 7 PM IST</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p className="text-center sm:text-left">
              &copy; {siteConfig.establishedYear}&ndash;{currentYear} <strong>FRAMIQ</strong> by <strong>Pratima Entertainment &amp; Technology</strong>. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link href="/refund-policy" className="hover:text-primary transition-colors">
                Refunds
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
