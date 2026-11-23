import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  CreditCard,
  Sparkles,
  Building2,
  Users,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BillingPlansTable,
  type SerializedPlan,
} from './billing-plans-table';

export const metadata: Metadata = {
  title: 'Subscription & Billing - Studio Settings | Pratima ERP',
  description: 'Manage your studio subscription plans, resource allocations, and Razorpay billing invoices.',
};

export default async function TenantBillingPage() {
  // 1. Enforce authentication and resolve tenant context
  const session = await auth();
  const user = session?.user as { tenantId?: string; role?: string } | undefined;
  const tenantId = user?.tenantId;

  if (!session?.user || !tenantId) {
    redirect('/login');
  }

  // 2. Fetch tenant profile, current subscription, usage quotas, and transactions in parallel
  const [tenant, tenantSubscription, branchCount, staffCount, allPlans, transactions] =
    await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          createdAt: true,
        },
      }),
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: {
          plan: true,
        },
      }),
      prisma.branch.count({
        where: { tenantId },
      }),
      prisma.user.count({
        where: { tenantId },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      }),
      prisma.billingTransaction.findMany({
        where: { tenantId },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
    ]);

  if (!tenant) {
    redirect('/login');
  }

  // 3. Serialize Decimal fields for Client Component boundary
  const serializedPlans: SerializedPlan[] = allPlans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    monthlyPrice: Number(p.monthlyPrice),
    annualPrice: Number(p.annualPrice),
    maxBranches: p.maxBranches,
    maxStaff: p.maxStaff,
    smsCredits: p.smsCredits,
    whatsappCredits: p.whatsappCredits,
    isActive: p.isActive,
  }));

  // 4. Compute status metrics and trial countdown
  const now = new Date();
  const trialEnds = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const trialDaysRemaining = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const currentPlan = tenantSubscription?.plan || allPlans[0];
  const isTrial = tenant.subscriptionStatus === 'TRIAL';
  const isActive = tenant.subscriptionStatus === 'ACTIVE';
  const isPastDue = tenant.subscriptionStatus === 'PAST_DUE';

  return (
    <div className="flex-1 space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-foreground">
              Subscription &amp; Billing
            </h1>
            <Badge
              variant="outline"
              className={
                isActive
                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold'
                  : isTrial
                  ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold'
                  : 'border-destructive/30 text-destructive bg-destructive/10 font-bold'
              }
            >
              {tenant.subscriptionStatus}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your studio tier, scale branch and staff quotas, and review secure Razorpay payment receipts.
          </p>
        </div>
      </div>

      {/* Subscription Status Alert Banner */}
      {isTrial && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                15-Day Free Trial Active ({trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your trial will end on{' '}
                <span className="font-semibold text-foreground">
                  {trialEnds ? trialEnds.toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'soon'}
                </span>
                . Select an active plan below to ensure continuous client photo proofing and shoot sync.
              </p>
            </div>
          </div>
        </div>
      )}

      {isActive && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Active Subscription • {currentPlan?.name ?? 'Studio Plan'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tenantSubscription?.endDate
                  ? `Your subscription is active until ${new Date(
                      tenantSubscription.endDate
                    ).toLocaleDateString('en-IN', { dateStyle: 'long' })} (${
                      tenantSubscription.billingCycle === 'ANNUAL' ? 'Annual Billing' : 'Monthly Billing'
                    }).`
                  : 'Active unlimited studio subscription.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-destructive">Subscription Past Due</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your previous payment attempt was unsuccessful. Please renew your plan below to restore all features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resource Utilization & Current Quota Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Branch Limit */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Studio Branches</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-heading text-foreground">
              {branchCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {currentPlan ? currentPlan.maxBranches : 1}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {currentPlan && branchCount >= currentPlan.maxBranches
                ? 'Branch allocation limit reached'
                : 'Active location capacity'}
            </p>
          </CardContent>
        </Card>

        {/* Staff Limit */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Staff &amp; Crew</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-heading text-foreground">
              {staffCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {currentPlan ? currentPlan.maxStaff : 3}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {currentPlan && staffCount >= currentPlan.maxStaff
                ? 'Staff quota reached'
                : 'Team logins allowed'}
            </p>
          </CardContent>
        </Card>

        {/* SMS Credits */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">SMS Quota</span>
              <Smartphone className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-heading text-foreground">
              {currentPlan ? currentPlan.smsCredits.toLocaleString('en-IN') : 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Transactional SMS included</p>
          </CardContent>
        </Card>

        {/* WhatsApp Credits */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Quota</span>
              <MessageSquare className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-heading text-foreground">
              {currentPlan ? currentPlan.whatsappCredits.toLocaleString('en-IN') : 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Cloud API messages included</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Plans & Upgrade Matrix */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold font-heading text-foreground">Available Subscription Plans</h2>
          <p className="text-xs text-muted-foreground">
            Upgrade or renew your studio tier anytime. Payments are processed securely via Razorpay with instant activation.
          </p>
        </div>

        <BillingPlansTable
          plans={serializedPlans}
          currentPlanId={tenantSubscription?.planId}
          currentBillingCycle={tenantSubscription?.billingCycle}
          subscriptionStatus={tenant.subscriptionStatus}
        />
      </div>

      {/* Recent Billing Transactions History */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-bold font-heading text-foreground">Payment History &amp; Receipts</h2>
          <p className="text-xs text-muted-foreground">
            Audit history of all Razorpay subscription charges and tax invoices for {tenant.name}.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">No payment transactions recorded yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              When you activate or renew a paid plan via Razorpay, tax invoices will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Razorpay Order ID</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-foreground font-medium">
                        {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {tx.razorpayOrderId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {tx.razorpayPaymentId || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            tx.status === 'SUCCESS'
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]'
                              : tx.status === 'PENDING'
                              ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px]'
                              : 'border-destructive/30 text-destructive bg-destructive/10 text-[10px]'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Security & GST Compliance Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>PCI-DSS Level 1 &amp; ISO 27001 Certified Payment Infrastructure powered by Razorpay</span>
        </div>
        <span>All transactions include 18% GST with B2B Input Tax Credit eligibility</span>
      </div>
    </div>
  );
}
