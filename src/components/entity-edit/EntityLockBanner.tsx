import * as React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface EntityLockBannerProps {
  reason?: string;
  lockedBy?: string;
  className?: string;
}

export function EntityLockBanner({ reason = "This record is locked and cannot be edited.", lockedBy, className }: EntityLockBannerProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md flex items-start gap-3">
      <Lock className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex flex-col text-sm">
        <span className="font-medium">Record Locked</span>
        <span>{lockedBy ? `Locked by ${lockedBy}. ` : ''}{reason}</span>
      </div>
    </div>
  );
}
