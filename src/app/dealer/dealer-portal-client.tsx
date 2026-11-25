'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Copy,
  CheckCircle2,
  Share2,
  Users,
  Building2,
  IndianRupee,
  Clock,
  ExternalLink,
  ShieldCheck,
  Landmark,
  Percent,
  Sparkles,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney } from '@/lib/currency';
import type { DealerPortalData } from '@/actions/dealer-portal.actions';

export function DealerPortalClient({ data }: { data: DealerPortalData }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopiedLink(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.dealer.dealerCode);
    setCopiedCode(true);
    toast.success(`Referral code ${data.dealer.dealerCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Shareable Link Hero */}
      <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-card to-background p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Official FRAMIQ Partner
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Partner ID: #{data.dealer.dealerCode}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-heading text-foreground">
              Welcome back, {data.dealer.contactPerson || data.dealer.businessName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share your partner link with photography studios. They receive an exclusive first-payment discount, and you earn lifetime recurring commissions on every subscription payment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="gap-2 text-xs font-mono font-bold tracking-wider"
            >
              {copiedCode ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>Code: {data.dealer.dealerCode}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {copiedLink ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span>Copy Partner Link</span>
            </Button>
          </div>
        </div>

        {/* Shareable Link Box with Offer Badges */}
        <div className="p-4 rounded-xl border border-border/80 bg-background/80 backdrop-blur-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">Your Exclusive Referral Link:</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                Studio Gets: {data.dealer.firstPaymentDiscountPercent}% OFF
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                You Earn: {data.dealer.commissionPercent}% Lifetime Recurring
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs text-primary font-medium px-3 py-2 rounded-lg bg-muted/60 border border-border truncate select-all">
              {data.referralLink}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs gap-1.5 shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="text-2xl font-bold font-heading text-foreground">
              {data.metrics.totalReferredStudios}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {data.metrics.activePayingStudios} Active Subscribers
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Lifetime Earnings */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Lifetime Commission
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {formatMoney(data.metrics.lifetimeCommission)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              At {data.dealer.commissionPercent}% recurring rate
            </p>
          </CardContent>
        </Card>

        {/* Pending Payout */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending Payout
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              {formatMoney(data.metrics.pendingPayout)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Settled directly to your bank account
            </p>
          </CardContent>
        </Card>

        {/* Total Paid Out */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Disbursed
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-foreground">
              {formatMoney(data.metrics.totalPaidOut)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total processed bank payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="studios" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="studios" className="text-xs">
            Referred Studios ({data.referredStudios.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">
            Commission Ledger ({data.commissions.length})
          </TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs">
            Payout History ({data.payouts.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">
            Settlement Profile
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Referred Studios */}
        <TabsContent value="studios" className="mt-4">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Referred Photography Studios</CardTitle>
              <CardDescription className="text-xs">
                Studios that registered using your exclusive partner code. Customer privacy and finances are strictly protected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.referredStudios.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No studios registered yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Share your partner link to start earning recurring commissions.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2.5 font-semibold">Studio Name</th>
                        <th className="px-4 py-2.5 font-semibold">City</th>
                        <th className="px-4 py-2.5 font-semibold">Subscription Status</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Registered On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.referredStudios.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{s.city}</td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={
                                s.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : s.status === 'TRIAL'
                                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              }
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                            {format(new Date(s.joinedAt), 'dd MMM yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Recurring Commission Ledger */}
        <TabsContent value="ledger" className="mt-4">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recurring Commission Ledger</CardTitle>
              <CardDescription className="text-xs">
                Detailed transaction log of all initial purchases, renewals, and add-ons generated by your studios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.commissions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No commission events recorded yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Commissions are credited automatically when your referred studios complete payment.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2.5 font-semibold">Date</th>
                        <th className="px-4 py-2.5 font-semibold">Studio</th>
                        <th className="px-4 py-2.5 font-semibold">Payment Cycle</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Net Paid</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Commission Rate</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Your Commission</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {format(new Date(c.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{c.studioName}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {c.paymentCycleNumber === 1 ? 'Initial Purchase' : `Renewal #${c.paymentCycleNumber}`}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium">
                            {formatMoney(c.netPaidAmount)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                            {c.commissionPercent}%
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(c.commissionAmount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Payout History */}
        <TabsContent value="payouts" className="mt-4">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Bank Payout History</CardTitle>
              <CardDescription className="text-xs">
                All commission disbursements transferred to your registered bank account by FRAMIQ Finance Desk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.payouts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Landmark className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No payouts disbursed yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Payouts are processed according to your commercial agreement with Pratima Entertainment &amp; Technology.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2.5 font-semibold">Disbursed At</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Amount Disbursed</th>
                        <th className="px-4 py-2.5 font-semibold">Payment Mode</th>
                        <th className="px-4 py-2.5 font-semibold">Bank UTR / Ref</th>
                        <th className="px-4 py-2.5 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {format(new Date(p.paidAt), 'dd MMM yyyy, HH:mm')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(p.amount)}
                          </td>
                          <td className="px-4 py-2.5 font-mono">{p.paymentMode}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {p.transactionRef}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Settlement Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Partner Settlement Profile</CardTitle>
              <CardDescription className="text-xs">
                Your registered agency details and bank account on file for commission disbursements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Partner Business / Agency</span>
                  <div className="font-semibold text-sm">{data.dealer.businessName}</div>
                  <div className="text-xs text-muted-foreground">
                    Contact: {data.dealer.contactPerson} ({data.dealer.phone})
                  </div>
                  {data.dealer.city && (
                    <div className="text-xs text-muted-foreground">City: {data.dealer.city}</div>
                  )}
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Commercial Agreement</span>
                  <div className="text-xs flex items-center gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {data.dealer.commissionPercent}% Recurring Commission
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {data.dealer.firstPaymentDiscountPercent}% First-Payment Customer Discount
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Referral Code: <span className="font-mono font-bold text-foreground">{data.dealer.dealerCode}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Landmark className="h-4 w-4 text-primary" />
                  <span>Bank &amp; UPI Settlement Account on File</span>
                </div>
                {data.dealer.bankDetails ? (
                  <p className="font-mono text-xs whitespace-pre-wrap bg-background p-3 rounded-lg border border-border">
                    {data.dealer.bankDetails}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No bank details specified. Please provide your bank account or UPI ID to FRAMIQ Support.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  To update your bank details, phone, or commission terms, please contact FRAMIQ Support at suhaswagire.photo@gmail.com / +91 8087226509.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
