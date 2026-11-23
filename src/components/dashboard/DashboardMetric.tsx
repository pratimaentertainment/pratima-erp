import * as React from 'react';
import { cn } from '@/lib/utils';
import type { MetricConfig } from './types';

export function DashboardMetric({ config, className }: { config: MetricConfig, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
        {config.icon && <div className="text-muted-foreground">{config.icon}</div>}
      </div>
      <div className="text-2xl font-bold tracking-tight text-foreground">
        {config.value}
      </div>
      {config.trend && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className={cn(
            "font-medium",
            config.trend.direction === 'up' && "text-green-600",
            config.trend.direction === 'down' && "text-destructive",
            config.trend.direction === 'neutral' && "text-muted-foreground"
          )}>
            {config.trend.direction === 'up' && '↑'}
            {config.trend.direction === 'down' && '↓'}
            {config.trend.direction === 'neutral' && '→'}
            {' '}{config.trend.value}
          </span>
          {config.trend.label && <span className="text-muted-foreground">{config.trend.label}</span>}
        </div>
      )}
    </div>
  );
}
