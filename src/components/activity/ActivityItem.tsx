import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ActivityRecord } from './types';
import { MessageSquare, Mail, RefreshCw, Edit3, UserPlus, Info } from 'lucide-react';

interface ActivityItemProps {
  activity: ActivityRecord;
  className?: string;
  showLine?: boolean;
}

export function ActivityItem({ activity, className, showLine = true }: ActivityItemProps) {
  const getDefaultIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'status_change': return <RefreshCw className="h-4 w-4" />;
      case 'field_update': return <Edit3 className="h-4 w-4" />;
      case 'assignment': return <UserPlus className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const Icon = activity.icon || getDefaultIcon(activity.type);

  return (
    <div className={cn("relative flex gap-4", className)}>
      {showLine && (
        <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border" />
      )}
      
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground shadow-sm">
        {Icon}
      </div>
      
      <div className="flex flex-col gap-1 pb-2 pt-1 w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">
            <span className="text-foreground">{activity.actor.name}</span>
            <span className="text-muted-foreground font-normal ml-1">{activity.action}</span>
            {activity.target && <span className="font-semibold ml-1">{activity.target}</span>}
          </div>
          <time 
            className="text-xs text-muted-foreground shrink-0" 
            dateTime={typeof activity.timestamp === 'string' ? activity.timestamp : activity.timestamp.toISOString()}
            suppressHydrationWarning
          >
            {new Date(activity.timestamp).toLocaleString()}
          </time>
        </div>
        
        {activity.content && (
          <div className="mt-2 text-sm text-foreground bg-muted/20 p-3 rounded-md border">
            {activity.content}
          </div>
        )}
      </div>
    </div>
  );
}
