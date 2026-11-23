import * as React from 'react';
import { cn } from '@/lib/utils';
import { WorkflowBadges } from './WorkflowBadges';
import type { WorkflowHistoryEvent } from './types';

interface WorkflowHistoryProps {
  events: WorkflowHistoryEvent[];
  className?: string;
}

export function WorkflowHistory({ events, className }: WorkflowHistoryProps) {
  if (!events || events.length === 0) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4">
          {index !== events.length - 1 && (
            <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border" />
          )}
          
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-muted-foreground">
            {event.user.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex flex-col gap-1 pb-2 pt-1.5 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {event.user.name} <span className="font-normal text-muted-foreground">performed</span> {event.action}
              </span>
              <time 
                className="text-xs text-muted-foreground" 
                dateTime={typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toISOString()}
                suppressHydrationWarning
              >
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
            
            {(event.fromStatus || event.toStatus) && (
              <div className="flex items-center gap-2 mt-1 text-sm">
                {event.fromStatus && <WorkflowBadges status={event.fromStatus} />}
                {event.fromStatus && event.toStatus && <span className="text-muted-foreground">→</span>}
                {event.toStatus && <WorkflowBadges status={event.toStatus} />}
              </div>
            )}

            {event.reason && (
              <div className="mt-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border">
                &quot;{event.reason}&quot;
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
