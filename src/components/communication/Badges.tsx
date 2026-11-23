import * as React from 'react';
import { cn } from '@/lib/utils';

export function NotificationBadge({ count, className }: { count: number, className?: string }) {
  if (count === 0) return null;
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground min-w-[1.25rem]",
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function CommunicationStatusBadge({ status, className }: { status: string, className?: string }) {
  const getStatusColor = (s: string) => {
    switch(s) {
      case 'delivered':
      case 'read':
      case 'sent': return 'bg-success/10 text-success';
      case 'failed':
      case 'bounced': return 'bg-destructive/10 text-destructive';
      case 'sending': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", getStatusColor(status), className)}>
      {status}
    </span>
  );
}
