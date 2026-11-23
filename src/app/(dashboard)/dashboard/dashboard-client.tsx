'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueTrendChart } from '@/components/dashboard/revenue-trend-chart';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import {
  buildInvoiceOverdueReminder,
  buildShootCoordinationMessage,
} from '@/utils/whatsapp.utils';
import { formatMoney } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/date';
import type {
  OwnerDashboardData,
  UpcomingShootItem,
  RecentActivityItem,
  OverdueInvoiceItem,
  StaffShootItem,
  StaffTaskItem,
  StaffFollowUpItem,
} from '@/services/dashboard.service';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Users,
  Target,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  PhoneMissed,
  Camera,
  MapPin,
  Film,
  ArrowUpRight,
  ArrowRight,
  Activity,
  Plus,
  Landmark,
  Receipt,
  FileSpreadsheet,
  FileText,
  CalendarCheck,
  Building2,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Package,
  Phone,
  Briefcase,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface DashboardClientProps {
  metrics: OwnerDashboardData;
  followUpMetrics?: {
    todaysFollowUps?: number;
    overdueFollowUps?: number;
    missedFollowUps?: number;
    upcomingFollowUps?: number;
    completedToday?: number;
  };
  userName?: string;
  studioName?: string;
  isExecutive?: boolean;
}

export function DashboardClient({
  metrics,
  followUpMetrics,
  userName,
  studioName,
  isExecutive = false,
}: DashboardClientProps) {
  const followUps = followUpMetrics || {};
  const financials = metrics?.financials;
  const risks = metrics?.risks;
  const sales = metrics?.sales || { activeLeads: 0, totalLeads: 0, wonLeads: 0 };
  const operations = metrics?.operations || { upcomingShoots: [], totalUpcoming: 0 };
  const pendingEditsCount = metrics?.pendingEdits?.count || 0;
  const recentActivity = metrics?.recentActivity || [];
  const revenueTrend = metrics?.revenueTrend || [];
  const staffData = metrics?.staffData || {
    myShoots: [],
    myTasks: [],
    myFollowUps: [],
    stats: { totalShoots: 0, pendingTasks: 0, pendingFollowUps: 0 },
  };

  const conversionRate =
    sales.totalLeads > 0 ? ((sales.wonLeads / sales.totalLeads) * 100).toFixed(1) : '0.0';

  // Compute Aged AR distributions
  const aged = financials?.agedAR || { current: 0, days31to60: 0, over60: 0 };
  const totalAgedAR = aged.current + aged.days31to60 + aged.over60;
  const currentPct = totalAgedAR > 0 ? Math.round((aged.current / totalAgedAR) * 100) : 100;
  const days31to60Pct = totalAgedAR > 0 ? Math.round((aged.days31to60 / totalAgedAR) * 100) : 0;
  const over60Pct = totalAgedAR > 0 ? Math.round((aged.over60 / totalAgedAR) * 100) : 0;

  // ---------------------------------------------------------------------------
  // 1. STAFF ONLY WORKSPACE (Restricted Role: 0 Financial Leakage)
  // ---------------------------------------------------------------------------
  if (!isExecutive) {
    return (
      <div className="space-y-8">
        {/* Staff Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Welcome back{userName ? `, ${userName}` : ''}
              </h1>
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/40 text-primary">
                Staff Workspace
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {studioName || 'Pratima Photography ERP'} &bull; Assigned Productions, Editing Queue & Duties
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/operations/calendar"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Shoot Calendar
            </Link>
            <Link
              href="/operations/post-production"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Film className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Post-Production
            </Link>
            <Link
              href="/operations/follow-ups"
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1" />
              My Follow-ups
            </Link>
          </div>
        </div>

        {/* Staff Quick Stats Bar */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Upcoming Shoots
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                <Camera className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {staffData.stats.totalShoots}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled assignments</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Pending Delivery Tasks
              </CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                <Film className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {staffData.stats.pendingTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Culling, editing & proofing</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actionable Follow-ups
              </CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {staffData.stats.pendingFollowUps}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Client calls pending action</p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: My Assigned Shoots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              My Assigned Shoots & Productions
            </h2>
            <Link
              href="/operations/calendar"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              Full Calendar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {staffData.myShoots.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-3 bg-muted rounded-full mb-3 text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  No upcoming shoots assigned to you
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  You are all caught up! When you are booked on weddings, commercial shoots, or events, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffData.myShoots.map((shoot: StaffShootItem) => (
                <Card key={shoot.id} className="hover:shadow-sm transition-all border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono text-muted-foreground block">
                          #{shoot.bookingNumber || 'BK-NEW'}
                        </span>
                        <CardTitle className="text-sm font-bold line-clamp-1">
                          {shoot.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                        {shoot.myRole}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatDate(shoot.startDate)}
                        {shoot.endDate && shoot.endDate !== shoot.startDate && ` - ${formatDate(shoot.endDate)}`}
                      </span>
                    </div>

                    {shoot.location && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{shoot.location}</span>
                      </div>
                    )}

                    <div className="border-t pt-2 mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground truncate">
                        {shoot.customerName}
                      </span>
                      {shoot.customerPhone !== 'N/A' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${shoot.customerPhone}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {shoot.customerPhone}
                          </a>
                          <WhatsAppButton
                            phone={shoot.customerPhone}
                            messageText={buildShootCoordinationMessage({
                              eventName: shoot.title,
                              eventDate: formatDate(shoot.startDate),
                              clientName: shoot.customerName,
                            })}
                            size="xs"
                            variant="ghost"
                            iconOnly
                            title={`Send WhatsApp message to ${shoot.customerName}`}
                            className="h-5 w-5 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: My Post-Production Queue */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              My Post-Production Delivery Tasks
            </h2>
            <Link
              href="/operations/post-production"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              Open Post-Production Workbench <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {staffData.myTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-2" />
                <h3 className="text-sm font-semibold text-foreground">
                  No pending editing tasks
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  All assigned albums, video reels, and photo batches are up to date.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffData.myTasks.map((task: StaffTaskItem) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <Card key={task.id} className={`border transition-all ${isOverdue ? 'border-rose-400 bg-rose-500/5' : ''}`}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            #{task.bookingNumber}
                          </span>
                          <CardTitle className="text-sm font-bold line-clamp-1">
                            {task.taskType || task.type}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={isOverdue ? 'destructive' : 'outline'}
                          className="text-[10px] shrink-0"
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-2 text-xs">
                      <p className="text-muted-foreground font-medium text-[11px] line-clamp-1">
                        {task.bookingTitle}
                      </p>
                      <div className="flex items-center justify-between text-[11px] border-t pt-2">
                        <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>
                          Due: {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                        </span>
                        <Link
                          href="/operations/post-production"
                          className="text-primary hover:underline font-medium"
                        >
                          Work on Task &rarr;
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: My Follow-Up Calls */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              My Follow-Up Calls & Action Items
            </h2>
            <Link
              href="/operations/follow-ups"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              Manage Follow-ups <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {staffData.myFollowUps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1.5" />
                <h3 className="text-xs font-semibold text-foreground">
                  No pending follow-ups assigned
                </h3>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffData.myFollowUps.map((item: StaffFollowUpItem) => (
                <Card key={item.id} className="border p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-foreground text-sm block">
                        {item.leadName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.eventType || 'Client Inquiry'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {item.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-[11px]">
                    <span className="text-muted-foreground">
                      Scheduled: {formatDate(item.followUpDate)}
                    </span>
                    {item.leadPhone !== 'N/A' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${item.leadPhone}`}
                          className="text-primary hover:underline font-medium flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                        <WhatsAppButton
                          phone={item.leadPhone}
                          messageText={`Hello ${item.leadName}, this is following up regarding your event inquiry.`}
                          size="xs"
                          variant="ghost"
                          iconOnly
                          title={`Chat on WhatsApp with ${item.leadName}`}
                          className="h-5 w-5 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. EXECUTIVE 360-DEGREE MASTER COMMAND CENTER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* 1. Executive Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back{userName ? `, ${userName}` : ''}
            </h1>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Live Studio
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {studioName || 'Pratima Photography ERP'} &bull; Executive Studio Command Center (360-Degree View)
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/inquiries"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Plus className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            New Inquiry
          </Link>
          <Link
            href="/leads"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            Create Lead
          </Link>
          <Link
            href="/sales/quotations/new"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            New Quotation
          </Link>
          <Link
            href="/operations"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            Schedule Shoot
          </Link>
        </div>
      </div>

      {/* 2. Executive Financial Overview & Aged AR */}
      {financials && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Financial Health & Double-Entry Ledgers
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/finance/invoices"
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                Invoicing Workbench <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-muted-foreground/40">&bull;</span>
              <Link
                href="/finance/ledgers"
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                Chart of Accounts <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* 4 Core Financial KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Operating Revenue
                </CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatMoney(financials.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Double-entry recognized revenue
                </p>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operating Expenses
                </CardTitle>
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatMoney(financials.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Shoot logistics, gear & payouts
                </p>
              </CardContent>
            </Card>

            {/* Net Operating Margin */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Net Operating Margin
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    financials.netProfit >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    financials.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatMoney(financials.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Operating net margin
                </p>
              </CardContent>
            </Card>

            {/* Reconciled Receivables */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Receivables (AR)
                </CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatMoney(financials.pendingReceivables)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ledger 1100 & open invoice dues
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aged Accounts Receivable Breakdown & Top Overdue Invoices */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Left: Aged AR Distribution (2 cols) */}
            <Card className="lg:col-span-2 border">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    Aged Accounts Receivable
                  </CardTitle>
                  <span className="text-xs font-semibold font-mono text-muted-foreground">
                    {formatMoney(totalAgedAR)} Total
                  </span>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Aging classification of uncollected client balances
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Visual Segmented Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${currentPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`0-30d Current: ${formatMoney(aged.current)}`}
                    />
                    <div
                      style={{ width: `${days31to60Pct}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title={`31-60d Attention: ${formatMoney(aged.days31to60)}`}
                    />
                    <div
                      style={{ width: `${over60Pct}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`60d+ Critical: ${formatMoney(aged.over60)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Current (0-30d)</span>
                    <span>31-60 Days</span>
                    <span>60+ Days (Critical)</span>
                  </div>
                </div>

                {/* Aging Metric Tiles */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">0-30 Days</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {formatMoney(aged.current)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{currentPct}% of AR</span>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">31-60 Days</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {formatMoney(aged.days31to60)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{days31to60Pct}% of AR</span>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-rose-500/5 border-rose-500/20">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400">60+ Days</span>
                    </div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatMoney(aged.over60)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{over60Pct}% of AR</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Top 5 Overdue Invoices (3 cols) */}
            <Card className="lg:col-span-3 border">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Top Overdue Client Invoices
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Immediate collection attention required
                  </CardDescription>
                </div>
                <Link
                  href="/finance/invoices"
                  className={buttonVariants({ variant: 'outline', size: 'xs' })}
                >
                  All Invoices
                </Link>
              </CardHeader>
              <CardContent className="pt-3">
                {financials.overdueInvoices.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Zero overdue client invoices!
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      All issued tax invoices are fully paid or comfortably within payment terms.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {financials.overdueInvoices.map((inv: OverdueInvoiceItem) => (
                      <div
                        key={inv.id}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href="/finance/invoices"
                              className="font-mono font-bold text-foreground hover:text-primary transition-colors"
                            >
                              {inv.invoiceNumber}
                            </Link>
                            <Badge
                              variant={inv.daysOverdue > 60 ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {inv.daysOverdue}d overdue
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {inv.customerName}
                            {inv.customerPhone !== 'N/A' && ` &bull; ${inv.customerPhone}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-rose-600 dark:text-rose-400">
                              {formatMoney(inv.balanceDue)}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Due {inv.dueDate ? formatDate(inv.dueDate) : 'On Issue'}
                            </span>
                          </div>

                          <WhatsAppButton
                            phone={inv.customerPhone !== 'N/A' ? inv.customerPhone : undefined}
                            messageText={buildInvoiceOverdueReminder({
                              clientName: inv.customerName,
                              balanceDue: inv.balanceDue,
                              invoiceNumber: inv.invoiceNumber,
                            })}
                            size="xs"
                            variant="outline"
                            label="Remind"
                            title={`Send WhatsApp payment reminder to ${inv.customerName}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 6-Month Financial Trend Chart */}
          <Card className="overflow-hidden border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b bg-muted/20 pb-3">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight">
                  6-Month Revenue & Operating Expense Analytics
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Direct ledger trend between recognized revenues and studio operational expenditures
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/finance/reports"
                  className={buttonVariants({ variant: 'outline', size: 'xs' })}
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  CA Reports
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <RevenueTrendChart data={revenueTrend} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* 3. Operational Command & "Needs Action" Risk Radar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Operational Command & Risk Radar (Needs Action)
          </h2>
          <span className="text-xs text-muted-foreground">
            Automated production exception detection
          </span>
        </div>

        {/* 3 Risk Alarms Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 1. Shoots Missing Crew */}
          <Card
            className={`border transition-all ${
              (risks?.shootsMissingCrewCount || 0) > 0
                ? 'border-rose-400 dark:border-rose-800 bg-rose-500/5'
                : 'border-border'
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shoots Missing Crew (14d)
              </CardTitle>
              <Users
                className={`h-4 w-4 ${
                  (risks?.shootsMissingCrewCount || 0) > 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}
              />
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {risks?.shootsMissingCrewCount || 0}
                </span>
                <Link
                  href="/operations/calendar"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Assign Crew &rarr;
                </Link>
              </div>
              {(risks?.shootsMissingCrewCount || 0) === 0 ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> All upcoming shoots are staffed
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {risks?.shootsMissingCrew.slice(0, 2).map((s) => (
                    <div key={s.id} className="text-[11px] border-t border-rose-200/40 pt-1">
                      <span className="font-semibold text-foreground line-clamp-1">{s.title}</span>
                      <span className="text-muted-foreground">{formatDate(s.startDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Shoots Missing Gear */}
          <Card
            className={`border transition-all ${
              (risks?.shootsMissingGearCount || 0) > 0
                ? 'border-amber-400 dark:border-amber-800 bg-amber-500/5'
                : 'border-border'
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shoots Missing Gear (14d)
              </CardTitle>
              <Package
                className={`h-4 w-4 ${
                  (risks?.shootsMissingGearCount || 0) > 0 ? 'text-amber-500' : 'text-muted-foreground'
                }`}
              />
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {risks?.shootsMissingGearCount || 0}
                </span>
                <Link
                  href="/operations/inventory"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Dispatch Gear &rarr;
                </Link>
              </div>
              {(risks?.shootsMissingGearCount || 0) === 0 ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Gear allocations fully scheduled
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {risks?.shootsMissingGear.slice(0, 2).map((s) => (
                    <div key={s.id} className="text-[11px] border-t border-amber-200/40 pt-1">
                      <span className="font-semibold text-foreground line-clamp-1">{s.title}</span>
                      <span className="text-muted-foreground">{formatDate(s.startDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Overdue Post-Production Tasks */}
          <Card
            className={`border transition-all ${
              (risks?.overdueTasksCount || 0) > 0
                ? 'border-purple-400 dark:border-purple-800 bg-purple-500/5'
                : 'border-border'
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overdue Deliverables
              </CardTitle>
              <Film
                className={`h-4 w-4 ${
                  (risks?.overdueTasksCount || 0) > 0 ? 'text-purple-500' : 'text-muted-foreground'
                }`}
              />
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {risks?.overdueTasksCount || 0}
                </span>
                <Link
                  href="/operations/post-production"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Review Queue &rarr;
                </Link>
              </div>
              {(risks?.overdueTasksCount || 0) === 0 ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> All client edits on schedule
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {risks?.overdueTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="text-[11px] border-t border-purple-200/40 pt-1">
                      <span className="font-semibold text-foreground line-clamp-1">{t.bookingTitle}</span>
                      <span className="text-muted-foreground">Due {t.dueDate ? formatDate(t.dueDate) : 'N/A'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Follow-Up Conversion Pipeline Strip */}
        <div className="grid gap-3 sm:grid-cols-5 pt-1">
          <Card className="hover:border-blue-500/40 transition-colors p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Today&apos;s Calls</span>
              <Clock className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold">{followUps.todaysFollowUps || 0}</div>
          </Card>

          <Card className="hover:border-orange-500/40 transition-colors p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Overdue Calls</span>
              <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {followUps.overdueFollowUps || 0}
            </div>
          </Card>

          <Card className="hover:border-red-500/40 transition-colors p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Missed Leads</span>
              <PhoneMissed className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {followUps.missedFollowUps || 0}
            </div>
          </Card>

          <Card className="hover:border-purple-500/40 transition-colors p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Next 7 Days</span>
              <Calendar className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-bold">{followUps.upcomingFollowUps || 0}</div>
          </Card>

          <Card className="hover:border-green-500/40 transition-colors p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Done Today</span>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {followUps.completedToday || 0}
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Production & Sales Operations Grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Sales Pipeline Summary */}
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Sales & Booking Pipeline
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Lead acquisition and conversion metrics
              </CardDescription>
            </div>
            <Link
              href="/leads"
              className={buttonVariants({ variant: 'ghost', size: 'xs' })}
            >
              View Leads <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs text-muted-foreground block">Active Inquiries</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {sales.activeLeads}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs text-muted-foreground block">Won Bookings</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {sales.wonLeads}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs text-muted-foreground block">Total Pipeline</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {sales.totalLeads}
                </span>
              </div>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Pipeline Win Rate:</span>
              </div>
              <span className="text-sm font-bold text-primary">{conversionRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Post-Production Status */}
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                Post-Production Delivery Queue
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Culling, editing, and album proofing workflows
              </CardDescription>
            </div>
            <Link
              href="/operations/post-production"
              className={buttonVariants({ variant: 'ghost', size: 'xs' })}
            >
              Open Queue <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs text-muted-foreground block">Pending Deliverables</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {pendingEditsCount}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs text-muted-foreground block">Shoots Next 14d</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {operations.totalUpcoming}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                All client photo selection & delivery pipelines active
              </span>
              <Link
                href="/operations/post-production"
                className={buttonVariants({ variant: 'outline', size: 'xs' })}
              >
                Review Deliverables
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. Upcoming Shoots & Productions (Next 14 Days) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Upcoming Shoots & Productions (Next 14 Days)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scheduled client events, venue locations, and dispatched crew assignments
            </p>
          </div>
          <Link
            href="/operations/calendar"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Full Calendar
          </Link>
        </div>

        {operations.upcomingShoots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 bg-muted rounded-full mb-3 text-muted-foreground">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No shoots scheduled in the next 14 days
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Your production schedule is clear. Book new photography or cinematography events to assign crew and equipment.
              </p>
              <Link
                href="/operations"
                className={buttonVariants({ variant: 'default', size: 'sm', className: 'mt-4' })}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule a Shoot
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operations.upcomingShoots.map((shoot: UpcomingShootItem) => (
              <Card key={shoot.id} className="hover:shadow-sm transition-all border">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-muted-foreground block">
                        #{shoot.bookingNumber || 'BK-NEW'}
                      </span>
                      <CardTitle className="text-sm font-bold line-clamp-1">
                        {shoot.title}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {shoot.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatDate(shoot.startDate)}
                      {shoot.endDate && shoot.endDate !== shoot.startDate && ` - ${formatDate(shoot.endDate)}`}
                    </span>
                  </div>

                  {shoot.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{shoot.location}</span>
                    </div>
                  )}

                  <div className="border-t pt-2 mt-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-medium text-foreground truncate">
                        {shoot.customerName || 'Studio Client'}
                      </span>
                      {shoot.customerPhone && shoot.customerPhone !== 'N/A' && (
                        <WhatsAppButton
                          phone={shoot.customerPhone}
                          messageText={buildShootCoordinationMessage({
                            eventName: shoot.title,
                            eventDate: formatDate(shoot.startDate),
                            clientName: shoot.customerName,
                          })}
                          size="xs"
                          variant="ghost"
                          iconOnly
                          title={`Coordinate via WhatsApp with ${shoot.customerName}`}
                          className="h-5 w-5 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        />
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {shoot.crewCount > 0 ? `${shoot.crewCount} Crew` : 'Unassigned'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 6. Live Activity Audit Trail & Studio Quick Actions */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Log */}
        <Card className="lg:col-span-2 border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Studio Activity Log
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Audit trail of changes across bookings, vouchers, and leads
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Live Feed
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((activity: RecentActivityItem) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between gap-3 text-xs border-b border-border/50 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {activity.entityType}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {activity.action}
                        </span>
                      </div>
                      {activity.notes && (
                        <p className="text-muted-foreground line-clamp-1 text-[11px]">
                          {activity.notes}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        by <span className="text-foreground">{activity.performedBy}</span>
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDateTime(activity.createdAt, 'dd MMM, hh:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Studio Operations Quick Hub */}
        <Card className="border">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base font-bold tracking-tight">
              Studio Quick Actions
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Direct access to essential enterprise modules
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <Link
              href="/operations/calendar"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Shoot Calendar</div>
                  <div className="text-[10px] text-muted-foreground">Crew scheduling & timelines</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/operations/inventory"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Warehouse & Gear</div>
                  <div className="text-[10px] text-muted-foreground">Equipment dispatch & maintenance</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/finance/invoices"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Invoicing Workbench</div>
                  <div className="text-[10px] text-muted-foreground">GST invoices, credit notes & collections</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/finance/vouchers"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Vouchers & Daybook</div>
                  <div className="text-[10px] text-muted-foreground">Double-entry accounting journal</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/finance/reports"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">CA Financial Reports</div>
                  <div className="text-[10px] text-muted-foreground">Balance sheet & P&L statements</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/customers"
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Customer Profiles</div>
                  <div className="text-[10px] text-muted-foreground">Client directory & history</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
