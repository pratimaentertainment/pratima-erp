'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Users,
  Search,
  IndianRupee,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Edit2,
  Eye,
  Send,
  Power,
  Percent,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/currency';
import { AddDealerDialog } from './add-dealer-dialog';
import { EditDealerDialog } from './edit-dealer-dialog';
import { RecordPayoutDialog } from './record-payout-dialog';
import { DealerDetailsDrawer } from './dealer-details-drawer';
import { toggleDealerStatusAction } from '@/actions/super-admin-dealer.actions';

export interface SuperAdminDealerItem {
  id: string;
  dealerCode: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  commissionPercent: number;
  firstPaymentDiscountPercent: number;
  bankDetails: string;
  isActive: boolean;
  createdAt: string;
  referredCount: number;
  lifetimeEarned: number;
  pendingPayout: number;
  totalPaid: number;
}

export interface SuperAdminDealersClientProps {
  initialDealers: SuperAdminDealerItem[];
  metrics: {
    totalDealers: number;
    activeDealers: number;
    totalReferredStudios: number;
    totalLifetimeCommissions: number;
    totalPendingPayout: number;
    totalPaidOut: number;
  };
}

export function DealersClient({ initialDealers, metrics }: SuperAdminDealersClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Dialog / Drawer States
  const [selectedDealerForEdit, setSelectedDealerForEdit] = useState<SuperAdminDealerItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [selectedDealerForPayout, setSelectedDealerForPayout] = useState<SuperAdminDealerItem | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);

  const [selectedDealerIdForDrawer, setSelectedDealerIdForDrawer] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pratima-erp.vercel.app';
    const link = `${origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success(`Copied referral link: ${link}`);
  };

  const handleToggleStatus = (dealer: SuperAdminDealerItem) => {
    const newStatus = !dealer.isActive;
    startTransition(async () => {
      try {
        const res = await toggleDealerStatusAction(dealer.id, newStatus);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to toggle status');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error toggling dealer status');
      }
    });
  };

  const filteredDealers = initialDealers.filter((d) => {
    const matchesSearch =
      d.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.dealerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && d.isActive) ||
      (statusFilter === 'SUSPENDED' && !d.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Partner Network &amp; Commission Desk
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin-only dealer management, first-payment studio discounts, and automated recurring lifetime commissions.
          </p>
        </div>
        <AddDealerDialog onCreated={() => router.refresh()} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Partners */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Dealers &amp; Partners
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{metrics.totalDealers}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {metrics.activeDealers} Active
              </span>
              <span>• {metrics.totalDealers - metrics.activeDealers} Suspended</span>
            </p>
          </CardContent>
        </Card>

        {/* Referred Studios */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Referred Studios
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
              {metrics.totalReferredStudios}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Studios linked via dealer partner codes
            </p>
          </CardContent>
        </Card>

        {/* Pending Payout */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending Payouts
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              {formatMoney(metrics.totalPendingPayout)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Unsettled partner commission liability
            </p>
          </CardContent>
        </Card>

        {/* Lifetime Commissions */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Lifetime Disbursed / Generated
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {formatMoney(metrics.totalPaidOut)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total generated: <span className="font-semibold">{formatMoney(metrics.totalLifetimeCommissions)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, agency, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="text-xs h-8 px-2.5"
            >
              {status === 'ALL' ? 'All Partners' : status === 'ACTIVE' ? 'Active' : 'Suspended'}
            </Button>
          ))}
        </div>
      </div>

      {/* Dealers Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {filteredDealers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No dealers found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by provisioning your first partner / dealer.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Dealer / Agency</th>
                  <th className="px-4 py-3 font-semibold">Referral Code</th>
                  <th className="px-4 py-3 font-semibold">Commercial Rates</th>
                  <th className="px-4 py-3 font-semibold text-center">Referred</th>
                  <th className="px-4 py-3 font-semibold text-right">Lifetime Earned</th>
                  <th className="px-4 py-3 font-semibold text-right">Pending Payout</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDealers.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    {/* Agency & Contact */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{d.businessName}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{d.contactPerson}</span>
                        <span>•</span>
                        <span>{d.phone}</span>
                        {d.city && (
                          <>
                            <span>•</span>
                            <span>{d.city}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Code & Quick Copy */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground px-2 py-0.5 rounded bg-muted border border-border">
                          {d.dealerCode}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(d.dealerCode)}
                          title="Copy shareable referral link"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>

                    {/* Rates */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {d.commissionPercent}% Recurring Commission
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 text-[11px]">
                          {d.firstPaymentDiscountPercent}% Studio 1st-Pay Discount
                        </span>
                      </div>
                    </td>

                    {/* Referred Count */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {d.referredCount} studios
                      </Badge>
                    </td>

                    {/* Lifetime Earned */}
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatMoney(d.lifetimeEarned)}
                    </td>

                    {/* Pending Payout */}
                    <td className="px-4 py-3 text-right">
                      {d.pendingPayout > 0 ? (
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatMoney(d.pendingPayout)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono">₹0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          d.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        }
                      >
                        {d.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Record Payout Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={d.pendingPayout <= 0}
                          onClick={() => {
                            setSelectedDealerForPayout(d);
                            setPayoutDialogOpen(true);
                          }}
                          title="Record Commission Payout"
                          className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-40"
                        >
                          <Send className="h-3 w-3" />
                          <span>Pay</span>
                        </Button>

                        {/* Ledger / Dossier */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDealerIdForDrawer(d.id);
                            setDrawerOpen(true);
                          }}
                          title="View Dossier & Ledger"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {/* Edit Dealer */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDealerForEdit(d);
                            setEditDialogOpen(true);
                          }}
                          title="Edit Partner Rates"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Suspend / Activate Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleToggleStatus(d)}
                          title={d.isActive ? 'Suspend Dealer' : 'Activate Dealer'}
                          className={`h-7 w-7 p-0 ${
                            d.isActive
                              ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10'
                              : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditDealerDialog
        dealer={selectedDealerForEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdated={() => router.refresh()}
      />

      {/* Payout Modal */}
      <RecordPayoutDialog
        dealer={selectedDealerForPayout}
        open={payoutDialogOpen}
        onOpenChange={setPayoutDialogOpen}
        onRecorded={() => router.refresh()}
      />

      {/* Dossier / Ledger Modal */}
      <DealerDetailsDrawer
        dealerId={selectedDealerIdForDrawer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
