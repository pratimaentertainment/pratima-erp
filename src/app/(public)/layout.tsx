import * as React from 'react';
import Link from 'next/link';
import { Camera, ShieldCheck, Mail, Phone, Heart } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Shared Public Top Navigation */}
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Shared Public Footer */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Column 1: Brand & Bio */}
            <div className="space-y-4 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-base tracking-tight font-heading">
                  Pratima ERP
                </span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The all-in-one Studio Operating System designed specifically for wedding and commercial photography businesses across India.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>GST Compliant & ISO 27001 Grade Cloud</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/pricing" className="hover:text-primary transition-colors">
                    Pricing Plans
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

            {/* Column 3: Legal & Trust */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Legal & Trust
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
                  <span className="text-muted-foreground/60 cursor-default">
                    Security Architecture
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground/60 cursor-default">
                    Refund & Cancellation Policy
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Support
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need assistance setting up your studio or selecting a plan? Our team is here to help.
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>support@pratimaerp.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>+91 98765 43210</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Pratima ERP. All rights reserved.</p>
            <p className="flex items-center gap-1 text-[11px]">
              Built with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for Indian Photography Studios
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
