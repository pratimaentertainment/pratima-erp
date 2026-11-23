import * as React from 'react';
import { cn } from '@/lib/utils';
import { NotificationItem } from './NotificationItem';
import type { CommunicationItemConfig } from './types';

interface NotificationListProps {
  items: CommunicationItemConfig[];
  onItemClick?: (item: CommunicationItemConfig) => void;
  className?: string;
  emptyMessage?: string;
}

export function NotificationList({ items, onItemClick, className, emptyMessage = "No notifications" }: NotificationListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col overflow-y-auto", className)}>
      {items.map(item => (
        <NotificationItem 
          key={item.id} 
          item={item} 
          onClick={onItemClick} 
        />
      ))}
    </div>
  );
}
