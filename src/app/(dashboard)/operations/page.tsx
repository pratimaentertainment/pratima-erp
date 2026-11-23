import * as React from 'react';
import Link from 'next/link';
import { getOperationsMetricsAction } from '@/actions/operations.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Camera, CheckSquare, Truck, Users, HardDrive } from 'lucide-react';
import { CreateBookingTrigger } from '@/features/operations/components/CreateBookingTrigger';

export default async function OperationsDashboard() {
  const metricsRes = await getOperationsMetricsAction();
  const metrics = metricsRes.success ? metricsRes.data : { activeProjects: 0, upcomingShoots: 0, pendingTasks: 0 };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operations Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage ongoing shoots, crew logistics, equipment allocation, and operational tasks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateBookingTrigger />
        </div>
      </div>
      
      {/* Core Operational KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Projects currently in progress</p>
          </CardContent>
        </Card>
        
        <Link href="/operations/calendar" className="group">
          <Card className="hover:border-primary/50 transition-all group-hover:shadow-xs cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Upcoming Shoots</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.upcomingShoots}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled future shoots & events</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/operations/tasks" className="group">
          <Card className="hover:border-primary/50 transition-all group-hover:shadow-xs cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Pending Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendingTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">Operational tasks pending completion</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Core Operational Workflows */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/operations/dispatch" className="group">
          <Card className="hover:border-primary transition-all group-hover:shadow-xs cursor-pointer h-full border-emerald-200/60 dark:border-emerald-950/60 bg-gradient-to-b from-emerald-50/10 to-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Operations Dispatch</CardTitle>
              <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-semibold text-foreground">Field Logistics & Call Sheets</div>
              <p className="text-xs text-muted-foreground mt-1">Manage event rosters, shoot itineraries, and automated WhatsApp dispatches</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/operations/dispatch" className="group">
          <Card className="hover:border-primary transition-all group-hover:shadow-xs cursor-pointer h-full border-blue-200/60 dark:border-blue-950/60 bg-gradient-to-b from-blue-50/10 to-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Crew & Gear Allocation</CardTitle>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-semibold text-foreground">Staff & Equipment Logistics</div>
              <p className="text-xs text-muted-foreground mt-1">Assign lead photographers, cinematographers, and track camera gear inventory</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/operations/data-ingestion" className="group">
          <Card className="hover:border-primary transition-all group-hover:shadow-xs cursor-pointer h-full border-indigo-200/60 dark:border-indigo-950/60 bg-gradient-to-b from-indigo-50/10 to-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Data Ingestion & Payouts</CardTitle>
              <HardDrive className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-semibold text-foreground">Raw Ingestion & Finance Bridge</div>
              <p className="text-xs text-muted-foreground mt-1">Verify memory cards, backup mirrors, and automate finance ledger payouts</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
