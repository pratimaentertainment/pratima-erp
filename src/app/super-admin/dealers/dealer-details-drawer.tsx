'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  Layers,
  Loader2,
  Receipt,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/currency';
import { getDealerLedgerAction } from '@/actions/super-admin-dealer.actions';

interface DealerDetailsDrawerProps {
  dealerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealerDetailsDrawer({
  dealerId,
  open,
  onOpenChange,
}: DealerDetailsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    dealer: any;
    referredTenants: any[];
    commissions: any[];
    payouts: any[];
  } | null>(null);

  useEffect(() => {
    if (dealerId && open) {
      setLoading(true);
      getDealerLedgerAction(dealerId)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [dealerId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {data?.dealer?.businessName || 'Dealer Partner Dossier'}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  Code: <span className="font-bold text-foreground">{data?.dealer?.dealerCode}</span> • Contact:{' '}
                  {data?.dealer?.contactPerson} ({data?.dealer?.phone})
                </DialogDescription>
              </div>
            </div>
            {data?.dealer && (
              <Badge
                variant="outline"
                className={
                  data.dealer.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }
              >
                {data.dealer.isActive ? 'Active Partner' : 'Suspended'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs">Loading dealer records &amp; ledger...</span>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No data found for this partner.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-[11px] text-muted-foreground">Referred Studios</div>
                <div className="text-lg font-bold">{data.referredTenants.length}</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-[11px] text-muted-foreground">Commission Rate</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {data.dealer.commissionPercent}%
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-[11px] text-muted-foreground">1st Payment Discount</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {data.dealer.firstPaymentDiscountPercent}%
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-[11px] text-muted-foreground">Pending Payout</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatMoney(
                    data.commissions
                      .filter((c) => c.status === 'PENDING')
                      .reduce((sum, c) => sum + c.commissionAmount, 0)
                  )}
                </div>
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="studios" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="studios" className="text-xs">
                  Referred Studios ({data.referredTenants.length})
                </TabsTrigger>
                <TabsTrigger value="ledger" className="text-xs">
                  Commission Ledger ({data.commissions.length})
                </TabsTrigger>
                <TabsTrigger value="payouts" className="text-xs">
                  Payouts Disbursed ({data.payouts.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Referred Studios */}
              <TabsContent value="studios" className="mt-3">
                {data.referredTenants.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No studios have registered with this partner code yet.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Studio Name</th>
                          <th className="px-3 py-2 font-medium">City</th>
                          <th className="px-3 py-2 font-medium">Subscription</th>
                          <th className="px-3 py-2 font-medium text-right">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.referredTenants.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium text-foreground">{t.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{t.city}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant="outline"
                                className={
                                  t.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    : t.status === 'TRIAL'
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground font-mono">
                              {format(new Date(t.joinedAt), 'dd MMM yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Commission Ledger */}
              <TabsContent value="ledger" className="mt-3">
                {data.commissions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No commission events recorded yet.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Studio</th>
                          <th className="px-3 py-2 font-medium">Cycle</th>
                          <th className="px-3 py-2 font-medium text-right">Net Paid</th>
                          <th className="px-3 py-2 font-medium text-right">Rate</th>
                          <th className="px-3 py-2 font-medium text-right">Commission</th>
                          <th className="px-3 py-2 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.commissions.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 text-muted-foreground font-mono">
                              {format(new Date(c.date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">{c.tenantName}</td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {c.paymentCycleNumber === 1 ? '1st Payment' : `Renewal #${c.paymentCycleNumber}`}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">
                              {formatMoney(c.netPaidAmount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {c.commissionPercent}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(c.commissionAmount)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant="outline"
                                className={
                                  c.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }
                              >
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Payouts */}
              <TabsContent value="payouts" className="mt-3">
                {data.payouts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No payouts disbursed to this partner yet.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Disbursed At</th>
                          <th className="px-3 py-2 font-medium text-right">Amount</th>
                          <th className="px-3 py-2 font-medium">Mode</th>
                          <th className="px-3 py-2 font-medium">UTR / Ref</th>
                          <th className="px-3 py-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.payouts.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 text-muted-foreground font-mono">
                              {format(new Date(p.paidAt), 'dd MMM yyyy, HH:mm')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(p.amount)}
                            </td>
                            <td className="px-3 py-2 font-mono">{p.paymentMode}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {p.transactionRef}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{p.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
