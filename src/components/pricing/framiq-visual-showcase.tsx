'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  FileText,
  Calendar,
  Smartphone,
  CheckCircle2,
  Receipt,
  Users,
  Check,
  X,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Camera,
  Heart,
  Clock,
  Layers,
  Building2,
  Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FramiqVisualShowcase() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      question: 'How does the 15-day free trial work?',
      answer:
        'You receive immediate, full access to FRAMIQ after signing up. No credit card or upfront deposit is required. You can create quotations, test crew rostering, build client selection galleries, and generate GST invoices for your photography studio.',
    },
    {
      question: 'What is the difference between "In-House Login Staff" and "Unlimited Freelancers"?',
      answer:
        'In-House Login Staff are your core studio members who log in to the system with their own credentials (e.g. Studio Managers, Lead Cinematographers, In-House Editors). Freelancers are external gig crew members (second shooters, drone pilots, traditional video camera operators) who do not need logins. You can assign unlimited freelancers to shoot rosters without paying for extra seats.',
    },
    {
      question: 'Can I add extra branches or staff logins without upgrading to a higher plan?',
      answer:
        'Yes! FRAMIQ supports stackable modular add-ons. If you are on the Starter Plan (1 branch, 3 staff) and open a second branch, simply add "+1 Extra Branch" for ₹299/mo (total ₹798/mo) without jumping to the Multi-Branch tier. Similarly, you can add packs of 5 extra login staff for ₹199/mo anytime.',
    },
    {
      question: 'How does Pay-As-You-Need AI Face Recognition work?',
      answer:
        'On the Starter Plan and Multi-Branch Plan, you can unlock AI Face Recognition on a per-event basis for just ₹149 per wedding (or ₹1,199 for a 10-event pack). Guests take a selfie on their phone and instantly see their matching photos in 2 seconds. On the Franchise / Higher Plan, AI Face Recognition is inbuilt at ₹0 extra cost for all events.',
    },
    {
      question: 'Will I receive an 18% GST tax invoice for my studio?',
      answer:
        'Yes. FRAMIQ by Pratima Entertainment & Technology provides instant, 100% compliant B2B tax invoices with your studio GSTIN and HSN/SAC codes for seamless Input Tax Credit (ITC) claiming on every monthly or annual payment.',
    },
    {
      question: 'Can I switch between monthly and annual billing at any time?',
      answer:
        'Yes. You can switch between Monthly and Annual billing anytime from your Studio Settings. Annual billing includes a substantial discount equivalent to 2 months free.',
    },
  ];

  return (
    <div className="space-y-24 pt-8">
      {/* =========================================================================
          SECTION 1: SEE FRAMIQ IN ACTION - 6 PRODUCT UI MOCKUPS
          ========================================================================= */}
      <section className="space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Camera className="h-3.5 w-3.5" />
            <span>Interactive Visual Tour</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-foreground">
            See FRAMIQ In Action
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Purpose-built workflows engineered specifically for Indian wedding cinematographers, boutique studios, and multi-branch production houses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1: 2-Minute Branded Wedding Quotations */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      RL
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Royal Lens Studio</div>
                      <div className="text-[10px] text-muted-foreground">Quote #EST-2026-89</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                    WhatsApp Sent
                  </Badge>
                </div>
                {/* Ceremonies List */}
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex items-center justify-between text-muted-foreground py-0.5 border-b border-border/40">
                    <span>Pre-Wedding + Haldi</span>
                    <span className="font-semibold text-foreground">₹45,000</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground py-0.5 border-b border-border/40">
                    <span>Wedding &amp; Reception (3 Cam + Drone)</span>
                    <span className="font-semibold text-foreground">₹1,40,000</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-xs pt-1">
                    <span>Total Package</span>
                    <span className="text-primary font-mono font-black">₹1,85,000 + GST</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">2-Minute Branded Quotations</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Build itemized multi-day event estimates with candid, traditional, and drone deliverables. Send print-ready PDF proposals directly to client WhatsApp in 1 click.
              </p>
            </div>
          </div>

          {/* Card 2: Shoot Calendar & Double-Booking Guard */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Peak Muhurat Dates</span>
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Zero Conflicts
                  </Badge>
                </div>
                {/* Mini Calendar Row */}
                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-muted/50 border border-border/50">
                    <div className="text-muted-foreground">Nov 28</div>
                    <div className="font-bold text-foreground">2 Shoots</div>
                  </div>
                  <div className="p-1.5 rounded bg-primary/10 border border-primary/30 text-primary">
                    <div className="font-bold">Nov 29</div>
                    <div className="font-extrabold">3 Shoots</div>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50 border border-border/50">
                    <div className="text-muted-foreground">Nov 30</div>
                    <div className="font-bold text-foreground">1 Shoot</div>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50 border border-border/50">
                    <div className="text-muted-foreground">Dec 01</div>
                    <div className="font-bold text-foreground">2 Shoots</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-1.5 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>All 5 Sony FX3 Kits &amp; 8 Crew Members Confirmed</span>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Shoot Calendar &amp; Clash Guard</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Smart conflict detection blocks accidental double-bookings of lead cameras, master cinematographers, or studio vehicles across overlapping muhurat dates.
              </p>
            </div>
          </div>

          {/* Card 3: Client Portal & Mobile Album Selection */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Wedding Album Proofing</span>
                  <span className="text-[10px] font-mono text-primary font-bold">142 / 250 Selected</span>
                </div>
                {/* Photo Grid Preview */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'aspect-square rounded-md relative flex items-center justify-center text-[10px] font-bold border',
                        i <= 3
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-muted/40 border-border/40 text-muted-foreground'
                      )}
                    >
                      <span>IMG_{i}</span>
                      {i <= 3 && (
                        <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>Client: Sharma Wedding</span>
                  <Badge variant="outline" className="text-[9px] py-0">OTP Protected</Badge>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Client Portal &amp; Proofing</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Give bride &amp; groom a sleek mobile selection gallery with watermark security, heart favoriting, album layout limits, and digital approval sign-off.
              </p>
            </div>
          </div>

          {/* Card 4: AI Face Recognition Photo Delivery */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <span>AI Guest Photo Finder</span>
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    2s Match
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Guest Selfie Uploaded:</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">✓ Matched</span>
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    68 Wedding Photos Found in Full Resolution
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Pay-Per-Event: ₹149</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Inbuilt in Higher Plan</span>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <h3 className="text-base font-bold text-foreground">AI Face Recognition Delivery</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Delight wedding guests! They scan a QR code at the reception, snap a selfie, and instantly see their private album. Available per event or bundled free in Higher Plan.
              </p>
            </div>
          </div>

          {/* Card 5: 18% GST Invoicing & Installments */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Tax Invoice #INV-26-441</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Partially Paid
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Advance Booking (20%)</span>
                    <span className="text-foreground font-semibold">₹30,000 Paid</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shoot-Day Installment (60%)</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">₹90,000 Due Nov 29</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-1">
                    <span>CGST + SGST (18%)</span>
                    <span className="font-mono text-foreground">₹27,000</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">18% GST Invoices &amp; Installments</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automate milestone payments: Booking Advance, Shoot-Day Due, and Album Delivery Balance with automatic WhatsApp payment reminders and B2B GST tax credit.
              </p>
            </div>
          </div>

          {/* Card 6: In-House Staff & Unlimited Freelancers */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all group">
            {/* Mockup Header */}
            <div className="p-4 bg-muted/40 border-b border-border/60">
              <div className="rounded-xl border border-border/70 bg-background/95 p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Crew Rostering Engine</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">Shoot #W-412</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-primary/5 border border-primary/20">
                    <span className="font-semibold text-primary">In-House Staff (With Login)</span>
                    <Badge variant="secondary" className="text-[9px] py-0">3 of 3 Logins Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/5 border border-emerald-500/20">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">External Freelancers (Gig Crew)</span>
                    <span className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400">Unlimited (No Seat Fee)</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">In-House Seats + Unlimited Gig Crew</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Never pay per-freelancer fees! Roster 20+ freelance drone pilots, traditional videographers, and helpers on busy wedding weekends with zero seat surcharges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: SIDE-BY-SIDE PLAN COMPARISON TABLE
          ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" />
            <span>Side-by-Side Breakdown</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-foreground">
            Compare FRAMIQ Plan Capabilities
          </h2>
          <p className="text-sm text-muted-foreground">
            Clear, honest specifications. No hidden seat fees, no lock-in contracts, and completely transparent quotas.
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border/70 text-foreground font-bold">
                <tr>
                  <th className="py-4 px-6 text-sm font-heading">Plan Feature</th>
                  <th className="py-4 px-5 text-center min-w-[150px]">
                    <div className="text-sm font-bold">Starter Plan</div>
                    <div className="text-primary font-mono text-xs">₹499 / mo</div>
                  </th>
                  <th className="py-4 px-5 text-center min-w-[150px] bg-primary/5 border-x border-primary/20">
                    <Badge className="bg-primary text-primary-foreground text-[9px] mb-1">Most Popular</Badge>
                    <div className="text-sm font-bold">Multi-Branch Plan</div>
                    <div className="text-primary font-mono text-xs">₹1,299 / mo</div>
                  </th>
                  <th className="py-4 px-5 text-center min-w-[150px]">
                    <Badge className="bg-purple-600 text-white text-[9px] mb-1">All Inbuilt</Badge>
                    <div className="text-sm font-bold">Franchise / Higher Plan</div>
                    <div className="text-primary font-mono text-xs">₹2,999 / mo</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-muted-foreground">
                {/* Core CRM & ERP */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Full Core CRM &amp; ERP (Leads, Shoots, GST Invoices, Expenses)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Included
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                    ✓ Included
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Included
                  </td>
                </tr>

                {/* Studio Branches */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Studio Branches / Locations
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">
                    1 Studio HQ
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground bg-primary/5 border-x border-primary/20">
                    Up to 3 Branches
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">
                    Up to 5 Branches / Franchises
                  </td>
                </tr>

                {/* In-House Login Staff */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    In-House Login Staff Accounts
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">
                    3 Login Seats
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground bg-primary/5 border-x border-primary/20">
                    15 Login Seats
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">
                    30 Login Seats
                  </td>
                </tr>

                {/* External Freelancers */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    External Freelancers (Gig Crew, No Login)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    Unlimited (₹0)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                    Unlimited (₹0)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    Unlimited (₹0)
                  </td>
                </tr>

                {/* Client Proofing Portal */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Client Photo Proofing &amp; Album Selection Portal
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Included
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                    ✓ Included
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Included
                  </td>
                </tr>

                {/* AI Face Recognition */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    AI Face Recognition Guest Photo Delivery
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    Pay-Per-Event (₹149/event)
                  </td>
                  <td className="py-3.5 px-5 text-center bg-primary/5 border-x border-primary/20">
                    Pay-Per-Event (₹149/event)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✨ Inbuilt (₹0 Extra)
                  </td>
                </tr>

                {/* Customer Broadcast Messaging */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Client Database Broadcast Messaging
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    Optional Add-on (₹399/mo)
                  </td>
                  <td className="py-3.5 px-5 text-center bg-primary/5 border-x border-primary/20">
                    Optional Add-on (₹399/mo)
                  </td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✨ Inbuilt (₹0 Extra)
                  </td>
                </tr>

                {/* Franchise Network Tools */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Multi-Franchise Network &amp; Auto-Royalty Hub
                  </td>
                  <td className="py-3.5 px-5 text-center text-muted-foreground/60">—</td>
                  <td className="py-3.5 px-5 text-center text-muted-foreground/60 bg-primary/5 border-x border-primary/20">—</td>
                  <td className="py-3.5 px-5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Included
                  </td>
                </tr>

                {/* Modular Add-on Scaling */}
                <tr className="hover:bg-muted/10">
                  <td className="py-3.5 px-6 font-semibold text-foreground">
                    Modular Scaling (+1 Branch @ ₹299, +5 Staff @ ₹199)
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">Supported</td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground bg-primary/5 border-x border-primary/20">Supported</td>
                  <td className="py-3.5 px-5 text-center font-bold text-foreground">Supported</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: STUDIO OWNER FAQS
          ========================================================================= */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Everything you need to know about plans, quotas, freelancers, and billing.
          </p>
        </div>

        <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/40 overflow-hidden shadow-xs">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="transition-colors hover:bg-muted/10">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground transition-all"
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
                  <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: HIGH-CONTRAST BOTTOM CONVERSION CTA BANNER
          ========================================================================= */}
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold border border-white/20">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Join 100+ Professional Indian Studios</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight leading-tight">
            Ready to Modernize Your Photography Studio?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Eliminate shoot double-bookings, automate WhatsApp wedding proposals, and impress your couples with instant proofing and AI galleries.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-extrabold text-sm bg-primary hover:bg-primary/90 text-white shadow-lg transition-all"
            >
              <span>Start 15-Day Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://wa.me/918087226509?text=Hi%20FRAMIQ%20team%2C%20I%20want%20to%20learn%20more%20about%20the%20studio%20ERP%20plans."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat on WhatsApp (+91 8087226509)</span>
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 pt-2">
            <span>✓ No credit card required</span>
            <span>✓ Instant studio activation</span>
            <span>✓ 100% Indian GST ready</span>
          </div>
        </div>
      </section>
    </div>
  );
}
