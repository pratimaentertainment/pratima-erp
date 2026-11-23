import * as React from 'react';
import { RefreshCw, Download, Filter } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';
import { cn } from '@/lib/utils';

export function DashboardLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 h-full min-h-[100px] text-muted-foreground", className)}>
      <RefreshCw className="h-6 w-6 animate-spin mb-2 opacity-50" />
      <p className="text-xs font-medium">Loading data...</p>
    </div>
  );
}

export function DashboardError({ error, className }: { error?: Error | null, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 h-full min-h-[100px] text-destructive", className)}>
      <p className="text-sm font-semibold mb-1">Failed to load widget</p>
      <p className="text-xs opacity-80">{error?.message || 'An unknown error occurred.'}</p>
    </div>
  );
}

export function DashboardEmptyState({ title = "No data available", subtitle = "Try adjusting your filters", className }: { title?: string, subtitle?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 h-full min-h-[100px] text-muted-foreground text-center", className)}>
      <p className="text-sm font-medium mb-1 text-foreground">{title}</p>
      <p className="text-xs">{subtitle}</p>
    </div>
  );
}

export function DashboardFilterBar({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap bg-card border p-2 rounded-lg", className)}>
      <Filter className="h-4 w-4 text-muted-foreground ml-2 mr-1" />
      {children}
    </div>
  );
}

export function DashboardRefresh({ onRefresh, lastUpdated, className }: { onRefresh: () => void, lastUpdated?: Date, className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {lastUpdated && <span className="text-xs text-muted-foreground">Updated {lastUpdated.toLocaleTimeString()}</span>}
      <IconButton icon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh} aria-label="Refresh dashboard" variant="outline" size="sm" />
    </div>
  );
}

export function DashboardExport({ onExport, className }: { onExport: () => void, className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <IconButton icon={<Download className="h-4 w-4" />} onClick={onExport} aria-label="Export dashboard" variant="outline" size="sm" />
    </div>
  );
}

// Stubs for complex visualizations
export const DashboardChart = () => <DashboardEmptyState title="Chart Visualization" subtitle="Chart renderer requires dynamic import" />;
export const DashboardTable = () => <DashboardEmptyState title="Table Data" subtitle="No tabular data bound" />;
export const DashboardTimeline = () => <DashboardEmptyState title="Timeline" subtitle="No events to display" />;
export const DashboardActivity = () => <DashboardEmptyState title="Activity Feed" subtitle="No recent activity" />;
export const DashboardNotifications = () => <DashboardEmptyState title="Notifications" subtitle="You are all caught up" />;
export const DashboardQuickActions = () => <DashboardEmptyState title="Quick Actions" subtitle="No actions configured" />;
