import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Camera,
  CheckCircle2,
  Sparkles,
  Shield,
  Layers,
  ArrowLeft,
  CalendarCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignupForm } from './signup-form';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Sign Up - Register Your Studio | FRAMIQ by Pratima Entertainment & Technology',
  description:
    "India's Most Advanced Photography Studio ERP. Start your 15-day free trial on FRAMIQ by Pratima Entertainment & Technology.",
};

interface SignupPageProps {
  searchParams?: Promise<{ planId?: string; cycle?: string; ref?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const planId = resolvedSearchParams?.planId;
  const rawCycle = resolvedSearchParams?.cycle?.toUpperCase();
  const cycle: 'MONTHLY' | 'ANNUAL' = rawCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  let selectedPlan = null;
  if (planId) {
    try {
      selectedPlan = await prisma.subscriptionPlan.findFirst({
        where: { id: planId, isActive: true },
      });
    } catch (error) {
      console.error('[/signup] Error fetching subscription plan:', error);
      selectedPlan = null;
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* LEFT PANEL: Premium Photography Brand Experience (Hidden on mobile, 50% on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 text-white flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/80">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-40" />

        {/* Top Header: Logo & Back Navigation */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight font-heading block leading-none">
                FRAMIQ
              </span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                by Pratima Entertainment &amp; Technology
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Support
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-primary hover:text-primary/90 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Studio Operating System</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
              Scale Your Photography Studio with Zero Chaos
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Designed specifically for wedding cinematographers and photography businesses across India.
              Automate your quotations, crew dispatch sheets, client photo selections, and GST billing.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">15-Day Unrestricted Free Trial</p>
                <p className="text-[11px] text-zinc-400">Full access to test all ERP capabilities with zero upfront credit card required.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Intelligent Crew &amp; Shoot Logistics</p>
                <p className="text-[11px] text-zinc-400">Conflict-free crew allocation, automated WhatsApp call sheets, and freelancer TDS tracking.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-purple-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Isolated Tenant Cloud &amp; Watermarked Galleries</p>
                <p className="text-[11px] text-zinc-400">Client proofing galleries protected with server-side watermarks and AES-256 BYOS cloud encryption.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80">
          <p className="text-xs italic text-zinc-400 leading-relaxed">
            &ldquo;FRAMIQ transformed our multi-branch wedding studio into an automated powerhouse. Client selection turnaround times dropped by 50%.&rdquo;
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Rahul Mehta</span>
            <span className="text-zinc-500 font-mono text-[11px]">Creative Director, Aura Weddings</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Focused, Clean Signup Container (100% on mobile, 50% on desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-background">
        {/* Mobile-only branding top bar */}
        <div className="w-full max-w-md lg:hidden mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <span className="font-black text-base font-heading block leading-none">FRAMIQ</span>
              <span className="text-[9px] text-muted-foreground block">by Pratima Tech</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="text-xs font-medium text-primary hover:underline">
              Log In
            </Link>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-primary/30 text-primary bg-primary/5">
                {selectedPlan ? `${selectedPlan.name} • 15-Day Free Trial` : '15-Day Free Trial'}
              </Badge>
              <span className="text-[11px] text-muted-foreground">No credit card required</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-foreground">
              Register Your Studio
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Join leading photography studios across India. Start managing shoots, clients, and albums with ease.
            </p>
          </div>

          {/* Form component */}
          <SignupForm
            initialPlanId={selectedPlan?.id || planId}
            initialPlanName={selectedPlan?.name}
            initialCycle={cycle}
            initialRefCode={resolvedSearchParams?.ref}
          />

          {/* Legal Compliance Disclaimer */}
          <div className="pt-2 text-center text-[11px] text-muted-foreground space-y-1">
            <p>
              By registering your studio, you agree to FRAMIQ&apos;s{' '}
              <Link href="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>,{' '}
              <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, and{' '}
              <Link href="/refund-policy" className="text-primary hover:underline font-medium">Refund Policy</Link>.
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Need assistance?{' '}
              <Link href="/contact" className="hover:underline">Contact Official Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
