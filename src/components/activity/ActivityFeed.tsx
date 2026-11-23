import * as React from 'react';
import { cn } from '@/lib/utils';
import { ActivityItem } from './ActivityItem';
import type { ActivityRecord } from './types';
import { MessageSquareDashed } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityRecord[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-md bg-muted/10">
        <MessageSquareDashed className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 pt-2", className)}>
      {activities.map((activity, index) => (
        <ActivityItem 
          key={activity.id} 
          activity={activity} 
          showLine={index !== activities.length - 1} 
        />
      ))}
    </div>
  );
}
