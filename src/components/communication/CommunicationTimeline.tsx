import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CommunicationItemConfig } from './types';
import { getNotificationIcon } from './NotificationItem';
import { CommunicationStatusBadge as StatusBadge } from './Badges';

interface CommunicationTimelineProps {
  items: CommunicationItemConfig[];
  className?: string;
}

export function CommunicationTimeline({ items, className }: CommunicationTimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={cn("relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent", className)}>
      {items.map((item, idx) => (
        <div key={item.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            {getNotificationIcon(item.type)}
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm capitalize text-primary">{item.channel}</span>
              <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            <h4 className="font-medium text-sm text-card-foreground mb-1">{item.title}</h4>
            {item.previewText && <p className="text-xs text-muted-foreground mb-3">{item.previewText}</p>}
            <div className="flex items-center justify-between">
              {item.sender && <span className="text-xs font-medium text-muted-foreground">From: {item.sender.name}</span>}
              <StatusBadge status={item.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
