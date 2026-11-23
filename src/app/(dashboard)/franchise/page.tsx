import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Network, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { getFranchisorDashboardAction } from '@/actions/franchise.actions';
import { FranchisorDashboardClient } from '@/components/features/franchise/FranchisorDashboardClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Franchise Network & Royalty Desk | Pratima ERP',
  description: 'Manage child franchisee studios, monitor network bookings, and govern auto-accrued royalties.',
};

export const dynamic = 'force-dynamic';

export default async function FranchisePage() {
  const result = await getFranchisorDashboardAction();

  if (!result.success || !result.data) {
    return (
      <div className="container max-w-4xl py-12 px-4 sm:px-6">
        <Card className="border-border/80 shadow-sm bg-card/60 overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary w-fit mx-auto">
              <Network className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-heading text-foreground">
                Franchise Network Workspace
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                {result.error ||
                  'Your studio workspace is currently configured as a single studio. Franchise Network capabilities are reserved for Master Franchisors.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-muted/30 max-w-md mx-auto text-xs text-muted-foreground text-left space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                <span>Enterprise Franchising Features</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Dynamic pay-as-you-grow Flexi Billing for network branches</li>
                <li>Parent-sponsored software licensing for franchisee studios</li>
                <li>1-click lead transfer and dispatching across studios</li>
                <li>Automated shoot royalty calculation and settlement ledger</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Dashboard</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <FranchisorDashboardClient initialData={result.data} />
    </div>
  );
}
