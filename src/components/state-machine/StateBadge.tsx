import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/badges/Badge';
import type { SystemState } from './types';

interface StateBadgeProps {
  state: SystemState;
  className?: string;
}

export function StateBadge({ state, className }: StateBadgeProps) {
  const getVariant = (s: SystemState) => {
    const sLower = s.toLowerCase();
    if (['approved', 'active', 'completed', 'success', 'closed'].includes(sLower)) return 'success';
    if (['rejected', 'cancelled', 'error', 'failed'].includes(sLower)) return 'danger';
    if (['pending', 'submitted', 'review', 'in-progress'].includes(sLower)) return 'warning';
    if (['draft', 'archived', 'inactive'].includes(sLower)) return 'neutral';
    return 'neutral';
  };

  return (
    <Badge variant={getVariant(state)} className={cn("capitalize font-medium", className)}>
      {state}
    </Badge>
  );
}
