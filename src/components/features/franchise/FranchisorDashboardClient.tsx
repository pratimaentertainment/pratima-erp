'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarCheck,
  IndianRupee,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import { FlexiBillingBanner } from './FlexiBillingBanner';
import { CreateFranchiseModal } from './CreateFranchiseModal';
import { RecordSettlementModal } from './RecordSettlementModal';
import { FranchiseePerformanceTable, type FranchiseeRow } from './FranchiseePerformanceTable';
import { RoyaltyLedgerTable, type RoyaltyLedgerRow } from './RoyaltyLedgerTable';
import { syncMissingFranchiseRoyaltiesAction } from '@/actions/franchise.actions';

interface FranchisorDashboardClientProps {
  initialData: {
    franchisor: {
      id: string;
      name: string;
      slug: string;
    };
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
    kpis: {
      totalFranchiseesCount: number;
      activeFranchiseesCount: number;
      totalBookingsAcrossNetwork: number;
      totalGrossVolumeAcrossNetwork: number;
      totalRoyaltyEarned: number;
      totalRoyaltyPending: number;
      totalRoyaltySettled: number;
    };
    franchisees: FranchiseeRow[];
    ledger: RoyaltyLedgerRow[];
  };
}

export function FranchisorDashboardClient({ initialData }: FranchisorDashboardClientProps) {
  const router = useRouter();
  const [isSyncingAll, startSyncTransition] = useTransition();
  const [settlementEntry, setSettlementEntry] = useState<RoyaltyLedgerRow | null>(null);

  const { franchisor, flexiBilling, kpis, franchisees, ledger } = initialData;

  const handleSyncAll = () => {
    startSyncTransition(async () => {
      try {
        const res = await syncMissingFranchiseRoyaltiesAction();
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to sync franchise royalties.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error occurred while syncing royalties.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-foreground flex items-center gap-2">
            <span>Franchise Network & Royalty Desk</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Oversee child franchisee studios, monitor cross-network shoot volume, and govern auto-accrued royalties.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing...' : 'Sync All Royalties'}</span>
          </Button>

          <CreateFranchiseModal />
        </div>
      </div>

      {/* Dynamic Flexi-Billing Pay-As-You-Grow Banner */}
      <FlexiBillingBanner flexiBilling={flexiBilling} />

      {/* Network KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Franchise Studios */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Network Studios
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              {kpis.activeFranchiseesCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {kpis.totalFranchiseesCount} total
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live franchisee studios in your brand
            </p>
          </CardContent>
        </Card>

        {/* Network Shoot Volume */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Network Shoot Volume
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400">
              ₹{kpis.totalGrossVolumeAcrossNetwork.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Across {kpis.totalBookingsAcrossNetwork} confirmed shoots
            </p>
          </CardContent>
        </Card>

        {/* Total Royalty Accrued */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Royalty Earned
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-foreground">
              ₹{kpis.totalRoyaltyEarned.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Cumulative royalty earned on franchisee shoots
            </p>
          </CardContent>
        </Card>

        {/* Pending Royalty Dues */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Royalty Dues
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400">
              ₹{kpis.totalRoyaltyPending.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ₹{kpis.totalRoyaltySettled.toLocaleString('en-IN')} settled to date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Section */}
      <Tabs defaultValue="franchisees" className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border/60">
          <TabsTrigger value="franchisees" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Franchise Studios ({franchisees.length})</span>
          </TabsTrigger>
          <TabsTrigger value="royalty-ledger" className="text-xs gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Royalty Ledger & Settlements ({ledger.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="franchisees" className="space-y-4">
          <FranchiseePerformanceTable franchisees={franchisees} />
        </TabsContent>

        <TabsContent value="royalty-ledger" className="space-y-4">
          <RoyaltyLedgerTable
            entries={ledger}
            onRecordSettlement={(entry) => setSettlementEntry(entry)}
          />
        </TabsContent>
      </Tabs>

      {/* Royalty Settlement Modal */}
      <RecordSettlementModal
        entry={settlementEntry}
        onClose={() => setSettlementEntry(null)}
      />
    </div>
  );
}
