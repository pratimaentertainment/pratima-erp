import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface EntityDraftBannerProps {
  lastSavedAt?: string | Date;
  isDirty?: boolean;
  className?: string;
}

export function EntityDraftBanner({ lastSavedAt, isDirty, className }: EntityDraftBannerProps) {
  return (
    <div className={cn("bg-warning/10 border border-warning/20 text-warning-foreground px-4 py-3 rounded-md flex items-start gap-3", className)}>
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex flex-col text-sm">
        <span className="font-medium">Draft Mode</span>
        <span suppressHydrationWarning>
          {isDirty 
            ? "You have unsaved changes. Please save to avoid data loss." 
            : `Last saved at ${lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'just now'}.`}
        </span>
      </div>
    </div>
  );
}
