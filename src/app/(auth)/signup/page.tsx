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

export const metadata: Metadata = {
  title: 'Sign Up - Create Your Studio | Pratima ERP',
  description: "India's Most Advanced Photography ERP. Onboard your studio in seconds.",
};

interface SignupPageProps {
  searchParams?: Promise<{ planId?: string; cycle?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const planId = resolvedSearchParams?.planId;
  const rawCycle = resolvedSearchParams?.cycle?.toUpperCase();
  const cycle: 'MONTHLY' | 'ANNUAL' = rawCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  let selectedPlan = null;
  if (planId) {
    selectedPlan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });
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
              <span className="text-lg font-bold tracking-tight font-heading block">
                Pratima ERP
              </span>
              <span className="text-[11px] text-zinc-400 block -mt-1">
                Studio Management Cloud
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
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>

        {/* Center Content: Value Propositions & Highlights */}
        <div className="relative z-10 my-auto py-10 space-y-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-amber-400 text-xs font-medium shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>India&apos;s #1 Photography Operating System</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight font-heading leading-tight text-white">
              Elevate your studio operations from inquiry to album delivery.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Consolidate customer leads, photographer shoots, photo selections, financial vouchers, and multi-branch teams inside one unified platform.
            </p>
          </div>

          {/* Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">Multi-Branch Sync</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Manage headquarters and satellite branches seamlessly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <CalendarCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">Shoot &amp; Crew Roster</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Eliminate double bookings for photographers and equipment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">Anti-Abuse Isolation</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Dedicated tenant data boundaries with phone &amp; PAN security.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">Client Selection Portal</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Direct client photo proofing with watermarks and approval locks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80">
          <p className="text-xs italic text-zinc-400 leading-relaxed">
            &ldquo;Pratima ERP transformed our multi-branch wedding studio into an automated powerhouse. Client selection turnaround times dropped by 50%.&rdquo;
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
            <span className="font-bold text-base font-heading">Pratima ERP</span>
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
          />
        </div>
      </div>
    </div>
  );
}
