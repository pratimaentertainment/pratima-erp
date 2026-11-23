import * as React from 'react';
import { cn } from '@/lib/utils';
import type { EntityTimelineEvent } from './types';

interface EntityStatusTimelineProps {
  events: EntityTimelineEvent[];
  className?: string;
}

export function EntityStatusTimeline({ events, className }: EntityStatusTimelineProps) {
  if (!events || events.length === 0) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4">
          {index !== events.length - 1 && (
            <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border" />
          )}
          
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            {event.icon ? (
              <span className="text-muted-foreground h-4 w-4 flex items-center justify-center">{event.icon}</span>
            ) : (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          
          <div className="flex flex-col gap-1 pb-2 pt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{event.title}</span>
              {event.status && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {event.status}
                </span>
              )}
            </div>
            
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <time 
                dateTime={typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toISOString()}
                suppressHydrationWarning
              >
                {new Date(event.timestamp).toLocaleString()}
              </time>
              {event.user && (
                <>
                  <span>•</span>
                  <span>{event.user.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
