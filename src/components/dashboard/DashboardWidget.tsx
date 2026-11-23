import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetConfig } from './types';
import { DashboardLoading, DashboardError, DashboardEmptyState } from './DashboardUtilities';

interface DashboardWidgetProps {
  config: DashboardWidgetConfig;
  className?: string;
  children?: React.ReactNode;
}

export function DashboardWidget({ config, className, children }: DashboardWidgetProps) {
  
  const getColSpanClass = () => {
    if (!config.colSpan) return '';
    if (typeof config.colSpan === 'number') return `col-span-${config.colSpan}`;
    
    const classes = [];
    if (config.colSpan.sm) classes.push(`sm:col-span-${config.colSpan.sm}`);
    if (config.colSpan.md) classes.push(`md:col-span-${config.colSpan.md}`);
    if (config.colSpan.lg) classes.push(`lg:col-span-${config.colSpan.lg}`);
    if (config.colSpan.xl) classes.push(`xl:col-span-${config.colSpan.xl}`);
    return classes.join(' ');
  };

  const getRowSpanClass = () => {
    if (!config.rowSpan) return '';
    return `row-span-${config.rowSpan}`;
  };

  return (
    <div 
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden",
        getColSpanClass(),
        getRowSpanClass(),
        className
      )}
      style={{ minHeight: config.minHeight }}
    >
      {config.loading ? (
        <DashboardLoading />
      ) : config.error ? (
        <DashboardError error={config.error} />
      ) : config.empty ? (
        <DashboardEmptyState />
      ) : (
        children
      )}
    </div>
  );
}
