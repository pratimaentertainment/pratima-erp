import * as React from 'react';
import { cn } from '@/lib/utils';

export function DashboardWidgetHeader({ title, subtitle, action, className }: { title?: string, subtitle?: string, action?: React.ReactNode, className?: string }) {
  if (!title && !subtitle && !action) return null;
  return (
    <div className={cn("flex items-center justify-between p-4 pb-2", className)}>
      <div className="flex flex-col">
        {title && <h3 className="text-sm font-semibold tracking-tight">{title}</h3>}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function DashboardWidgetBody({ children, className, noPadding }: { children: React.ReactNode, className?: string, noPadding?: boolean }) {
  return (
    <div className={cn("flex-1 overflow-auto", !noPadding && "p-4 pt-0", className)}>
      {children}
    </div>
  );
}

export function DashboardWidgetFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("mt-auto p-4 pt-0 border-t bg-muted/20 text-xs text-muted-foreground flex items-center", className)}>
      {children}
    </div>
  );
}
