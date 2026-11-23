import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardLayoutConfig } from './types';

interface DashboardGridProps {
  config: DashboardLayoutConfig;
  children: React.ReactNode;
  className?: string;
}

export function DashboardGrid({ config, children, className }: DashboardGridProps) {
  const getColsClass = () => {
    if (typeof config.columns === 'number') {
      return `grid-cols-${config.columns}`;
    }
    const cols = [];
    if (config.columns.sm) cols.push(`sm:grid-cols-${config.columns.sm}`);
    if (config.columns.md) cols.push(`md:grid-cols-${config.columns.md}`);
    if (config.columns.lg) cols.push(`lg:grid-cols-${config.columns.lg}`);
    if (config.columns.xl) cols.push(`xl:grid-cols-${config.columns.xl}`);
    return cols.join(' ');
  };

  const getGapClass = () => {
    switch(config.gap) {
      case 'sm': return 'gap-4';
      case 'lg': return 'gap-8';
      case 'md':
      default: return 'gap-6';
    }
  };

  return (
    <div className={cn("grid grid-cols-1", getGapClass(), getColsClass(), className)}>
      {children}
    </div>
  );
}
