import * as React from 'react';
import { MetricCard } from '@/components/cards';

export interface EntityStat {
  id: string;
  title: string;
  value: string | number;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  comparison?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface EntityStatsBarProps {
  stats: EntityStat[];
  className?: string;
}

export function EntityStatsBar({ stats, className }: EntityStatsBarProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
      {stats.map((stat) => (
        <MetricCard
          key={stat.id}
          title={stat.title}
          value={stat.value}
          trend={stat.trend}
          comparison={stat.comparison}
          icon={stat.icon}
          loading={stat.loading}
        />
      ))}
    </div>
  );
}
