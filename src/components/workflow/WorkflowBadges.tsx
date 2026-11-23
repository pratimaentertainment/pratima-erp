import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/badges/Badge';
import type { WorkflowStatusType } from './types';

interface WorkflowBadgesProps {
  status: WorkflowStatusType;
  className?: string;
}

export function WorkflowBadges({ status, className }: WorkflowBadgesProps) {
  const getVariant = (s: WorkflowStatusType) => {
    const sLower = s.toLowerCase();
    if (sLower.includes('approve') || sLower === 'completed' || sLower === 'active') return 'success';
    if (sLower.includes('reject') || sLower.includes('cancel') || sLower === 'error') return 'danger';
    if (sLower.includes('pending') || sLower.includes('review') || sLower === 'submitted') return 'warning';
    if (sLower === 'draft') return 'neutral';
    if (sLower === 'archived') return 'neutral';
    return 'neutral';
  };

  return (
    <Badge variant={getVariant(status)} className={cn("capitalize font-medium", className)}>
      {status}
    </Badge>
  );
}

export function WorkflowStatus({ status, className }: WorkflowBadgesProps) {
  return <WorkflowBadges status={status} className={className} />;
}
