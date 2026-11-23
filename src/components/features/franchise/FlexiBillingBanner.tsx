'use client';

import * as React from 'react';
import { Sparkles, Building2, Layers, IndianRupee, Info, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FlexiBillingBannerProps {
  flexiBilling: {
    planName: string;
    allowFranchises: boolean;
    billingCycle: string;
    baseMonthlyPrice: number;
    perFranchiseRate: number;
    activeFranchisesCount: number;
    currentFranchiseAddonMonthly: number;
    totalEstimatedMonthlyBill: number;
  };
}

export function FlexiBillingBanner({ flexiBilling }: FlexiBillingBannerProps) {
  const {
    planName,
    billingCycle,
    baseMonthlyPrice,
    perFranchiseRate,
    activeFranchisesCount,
    currentFranchiseAddonMonthly,
    totalEstimatedMonthlyBill,
  } = flexiBilling;

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Plan Info & Value Proposition */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/30 bg-primary/10 gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Flexi Pay-As-You-Grow Billing</span>
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {billingCycle} Cycle
              </Badge>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-heading text-foreground flex items-center gap-2">
              <span>{planName}</span>
              <span className="text-xs font-normal text-muted-foreground">
                (Parent-Sponsored Franchise Licensing)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                Franchisee studios pay zero software fees. All child branches inherit your subscription and auto-scale at{' '}
                <strong className="text-foreground">₹{perFranchiseRate.toLocaleString('en-IN')}/mo</strong> per active studio.
              </span>
            </p>
          </div>

          {/* Pricing Breakdown Breakdown Grid */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 bg-card/80 p-3 sm:p-4 rounded-xl border border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span>Base Plan</span>
              </span>
              <p className="text-sm font-bold text-foreground">
                ₹{baseMonthlyPrice.toLocaleString('en-IN')}/mo
              </p>
            </div>

            <div className="hidden sm:block text-muted-foreground font-light text-base">+</div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Franchises ({activeFranchisesCount})</span>
              </span>
              <p className="text-sm font-bold text-foreground">
                ₹{currentFranchiseAddonMonthly.toLocaleString('en-IN')}/mo
              </p>
            </div>

            <div className="hidden sm:block text-muted-foreground font-light text-base">=</div>

            <div className="space-y-0.5 pl-2 sm:pl-3 border-l border-border/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <IndianRupee className="h-3 w-3 text-primary" />
                <span>Total Monthly Est.</span>
              </span>
              <p className="text-base sm:text-lg font-black text-primary font-heading">
                ₹{totalEstimatedMonthlyBill.toLocaleString('en-IN')}/mo
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
