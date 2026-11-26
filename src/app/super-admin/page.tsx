import * as React from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCachedSubscriptionPlans, getCachedPlanAddons } from '@/services/catalog-cache.service';
import {
  Building2,
  Users,
  ShieldAlert,
  Sparkles,
  Phone,
  Calendar,
  Layers,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { RegisterStudioDialog } from './register-studio-dialog';
import { DeleteTenantButton } from './delete-tenant-button';
import { ManageTenantDialog } from './manage-tenant-dialog';
import { ImpersonateTenantButton } from './impersonate-tenant-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureAddonPriceListInitialized } from '@/actions/subscription.actions';

export const metadata: Metadata = {
  title: 'Super Admin - Studio Management | FRAMIQ by Pratima Entertainment & Technology',
  description: 'Enterprise B2B SaaS tenant provisioning and anti-abuse oversight.',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  await ensureAddonPriceListInitialized();

  const [studios, totalUsers, totalBranches, plansRaw, addonsRaw] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: { planId: true },
        },
        _count: {
          select: {
            users: true,
            branches: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.branch.count(),
    getCachedSubscriptionPlans(),
    getCachedPlanAddons(),
  ]);

  const availablePlans = plansRaw.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    monthlyPrice: Number(p.monthlyPrice),
    annualPrice: Number(p.annualPrice),
    isBasePlan: p.isBasePlan,
  }));

  const availableAddons = addonsRaw.map((a) => ({
    featureKey: a.featureKey,
    name: a.name,
    monthlyPrice: Number(a.monthlyPrice),
    annualPrice: Number(a.annualPrice),
  }));

  const activeTrials = studios.filter((s) => s.subscriptionStatus === 'TRIAL').length;

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
              Platform Super Admin
            </h1>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-mono border-primary/30 text-primary">
              Multi-Tenant
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Central studio provisioning, anti-abuse verification, and subscription oversight.
          </p>
        </div>

        <div>
          <RegisterStudioDialog />
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Studios
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studios.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active platform tenants</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Trials
            </CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {activeTrials}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">15-day evaluation accounts</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Branches
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBranches}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Operational branch nodes</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Users
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Staff & owner accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Studios Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Registered Photography Studios</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tenants registered across India with dedicated isolation boundaries and unique mobile/PAN locks.
            </p>
          </div>
          <span className="text-xs font-mono bg-background border border-border px-2.5 py-1 rounded-md text-muted-foreground">
            {studios.length} Records
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {studios.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No studios registered yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Click &quot;Register New Studio&quot; to provision the first tenant on FRAMIQ.
              </p>
              <RegisterStudioDialog />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[260px]">Studio &amp; Identifier</TableHead>
                    <TableHead>Contact (Anti-Abuse)</TableHead>
                    <TableHead>PAN / Tax ID</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Trial Expiration</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studios.map((studio) => {
                    const isLifetime = studio.subscriptionStatus === 'ACTIVE' && !studio.trialEndsAt;
                    const trialDate = studio.trialEndsAt
                      ? new Date(studio.trialEndsAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : isLifetime
                        ? 'Lifetime Access'
                        : 'N/A';

                    const isExpired = !isLifetime && studio.trialEndsAt && new Date(studio.trialEndsAt) < new Date();

                    return (
                      <TableRow key={studio.id} className="hover:bg-muted/30 transition-colors">
                        {/* Studio Name & Slug */}
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {studio.name}
                              </span>
                              {studio.city && (
                                <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                  {studio.city}
                                </Badge>
                              )}
                              {studio.isSuspectedDuplicate && (
                                <Badge variant="destructive" className="text-[9px] font-bold px-1.5 py-0 uppercase tracking-wider bg-destructive/15 text-destructive border-destructive/30">
                                  Suspected Duplicate
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                /{studio.slug}
                              </code>
                              {studio.isFranchisor && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold text-primary border-primary/30 bg-primary/10">
                                  Franchisor
                                </Badge>
                              )}
                              {studio.parentTenantId && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium text-muted-foreground border-border bg-muted/30">
                                  Franchisee
                                </Badge>
                              )}
                              <a
                                href={`/${studio.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                                title="Visit Storefront"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="flex flex-col text-xs space-y-0.5">
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {studio.contactPhone}
                            </span>
                            {studio.email && (
                              <span className="text-muted-foreground text-[11px]">
                                {studio.email}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* PAN */}
                        <TableCell>
                          {studio.panNumber ? (
                            <code className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded font-medium">
                              {studio.panNumber}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Not set</span>
                          )}
                        </TableCell>

                        {/* Subscription Status */}
                        <TableCell>
                          {isLifetime ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1 inline-flex items-center"
                            >
                              <Crown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              Lifetime
                            </Badge>
                          ) : studio.subscriptionStatus === 'TRIAL' ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold"
                            >
                              15-Day Trial
                            </Badge>
                          ) : studio.subscriptionStatus === 'ACTIVE' ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold"
                            >
                              Active
                            </Badge>
                          ) : studio.subscriptionStatus === 'PAST_DUE' ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] font-semibold"
                            >
                              Past Due
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px]">
                              {studio.subscriptionStatus}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Trial Ends */}
                        <TableCell>
                          {isLifetime ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Never Expires
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className={isExpired ? 'text-rose-500 font-semibold' : ''}>
                                {trialDate}
                                {isExpired && ' (Expired)'}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Metrics */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span title="Total Branches" className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {studio._count.branches}
                            </span>
                            <span>•</span>
                            <span title="Total Users" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {studio._count.users}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <ImpersonateTenantButton
                              tenantId={studio.id}
                              tenantName={studio.name}
                              tenantSlug={studio.slug}
                            />
                            <ManageTenantDialog
                              studio={{
                                ...studio,
                                currentPlanId: studio.subscription?.planId || null,
                              }}
                              availablePlans={availablePlans}
                              availableAddons={availableAddons}
                            />
                            <DeleteTenantButton tenantId={studio.id} tenantName={studio.name} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
