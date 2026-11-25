import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ShieldCheck, Radio, Layers, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GovernanceWorkspace } from './governance-workspace';
import {
  getAllPlatformBroadcastsAction,
  getGlobalAuditLogsAction,
} from '@/actions/super-admin-governance.actions';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Platform Governance & Audit Desk - Super Admin | FRAMIQ by Pratima Entertainment & Technology',
  description: 'Multi-tenant system broadcasts, compliance audit log viewer, and platform governance.',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminSettingsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const [broadcastsRes, auditLogsRes, totalTenants, totalUsers] = await Promise.all([
    getAllPlatformBroadcastsAction(),
    getGlobalAuditLogsAction({ limit: 25, offset: 0 }),
    prisma.tenant.count(),
    prisma.user.count(),
  ]);

  const broadcasts = broadcastsRes.broadcasts || [];
  const auditLogs = auditLogsRes.logs || [];
  const totalAuditCount = auditLogsRes.totalCount || 0;

  const activeBroadcastsCount = broadcasts.filter(
    (b) => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date())
  ).length;

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
              Platform Governance &amp; Audit Desk
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] tracking-wider uppercase font-mono border-primary/30 text-primary bg-primary/5"
            >
              Enterprise Security
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized platform broadcast announcements, emergency notice banners, and compliance audit trail tracking.
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Broadcasts
            </CardTitle>
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBroadcastsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active dashboard banners</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Audit Events
            </CardTitle>
            <History className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAuditCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Immutable security records</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Governed Studios
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Multi-tenant instances</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total User Identities
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Audited platform accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Tab Governance Workspace */}
      <GovernanceWorkspace
        initialBroadcasts={broadcasts as any}
        initialAuditLogs={auditLogs as any}
        totalAuditCount={totalAuditCount}
      />
    </div>
  );
}
