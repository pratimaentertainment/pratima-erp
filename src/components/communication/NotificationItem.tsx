import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CommunicationItemConfig } from './types';
import { 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  UserPlus, 
  MessageSquare, 
  AtSign, 
  Settings 
} from 'lucide-react';

export function getNotificationIcon(type: string, className?: string) {
  const props = { className: cn("h-4 w-4", className) };
  switch (type) {
    case 'success': return <CheckCircle {...props} className={cn(props.className, "text-green-500")} />;
    case 'info': return <Info {...props} className={cn(props.className, "text-blue-500")} />;
    case 'warning': return <AlertTriangle {...props} className={cn(props.className, "text-yellow-500")} />;
    case 'danger': return <AlertCircle {...props} className={cn(props.className, "text-red-500")} />;
    case 'reminder': return <Clock {...props} className={cn(props.className, "text-purple-500")} />;
    case 'approval': return <ThumbsUp {...props} className={cn(props.className, "text-green-600")} />;
    case 'rejection': return <ThumbsDown {...props} className={cn(props.className, "text-red-600")} />;
    case 'assignment': return <UserPlus {...props} className={cn(props.className, "text-indigo-500")} />;
    case 'comment': return <MessageSquare {...props} className={cn(props.className, "text-blue-400")} />;
    case 'mention': return <AtSign {...props} className={cn(props.className, "text-pink-500")} />;
    case 'system':
    default: return <Settings {...props} className={cn(props.className, "text-gray-500")} />;
  }
}

export function NotificationItem({ item, onClick, className }: { item: CommunicationItemConfig, onClick?: (item: CommunicationItemConfig) => void, className?: string }) {
  const isUnread = !item.isRead;
  
  return (
    <div 
      onClick={() => onClick?.(item)}
      className={cn(
        "flex gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors text-sm",
        isUnread ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent",
        className
      )}
    >
      <div className="shrink-0 mt-1">
        {getNotificationIcon(item.type)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium truncate", isUnread ? "text-foreground" : "text-muted-foreground")}>
            {item.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {item.previewText && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.previewText}
          </p>
        )}
        {item.actionLabel && (
          <div className="mt-1">
            <span className="text-xs font-semibold text-primary hover:underline">{item.actionLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
