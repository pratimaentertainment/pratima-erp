import * as React from 'react';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/cards';

export interface EntitySummaryItem {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

interface EntitySummaryProps {
  items: EntitySummaryItem[];
  className?: string;
}

export function EntitySummary({ items, className }: EntitySummaryProps) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <MetricCard
          key={item.id}
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          trend={item.trend}
          icon={item.icon}
        />
      ))}
    </div>
  );
}
