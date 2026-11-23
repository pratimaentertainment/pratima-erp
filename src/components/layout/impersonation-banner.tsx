'use client';

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Clock, LogOut, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stopTenantImpersonationAction } from '@/actions/impersonation.actions';
import { toast } from 'sonner';
import type { ImpersonationState } from '@/lib/impersonation';

interface ImpersonationBannerProps {
  impersonation: ImpersonationState;
}

export function ImpersonationBanner({ impersonation }: ImpersonationBannerProps) {
  const pathname = usePathname();
  const isSuperAdminRoute = pathname?.startsWith('/super-admin');
  const [isPending, startTransition] = useTransition();
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    return Math.max(0, impersonation.expiresAt - Date.now());
  });

  const handleExit = () => {
    startTransition(async () => {
      try {
        const res = await stopTenantImpersonationAction();
        if (res.success) {
          toast.success('Exited Support Mode. Returned to Super Admin.');
          window.location.href = res.redirectUrl || '/super-admin';
        } else {
          toast.error(res.error || 'Failed to exit support mode.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error exiting impersonation.');
      }
    });
  };

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, impersonation.expiresAt - Date.now());
      setTimeLeftMs(remaining);

      // Auto exit when time expires
      if (remaining <= 0) {
        toast.warning('Support impersonation session has expired.');
        handleExit();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [impersonation.expiresAt]);

  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpiringSoon = timeLeftMs < 2 * 60 * 1000; // Less than 2 minutes

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-500 text-amber-950 font-medium px-4 py-1.5 border-b border-amber-600/40 shadow-xs flex flex-wrap items-center justify-between gap-2 z-50 text-xs sm:text-sm select-none"
    >
      {/* Left: Mode Badge & Studio Info */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
          <ShieldAlert className="h-3 w-3 text-amber-400 animate-pulse" />
          Support Mode
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-amber-950/80">Viewing Studio:</span>
          <span className="font-bold text-amber-950">{impersonation.tenantName}</span>
          <span className="text-amber-950/70 font-mono text-xs">({impersonation.tenantSlug})</span>
        </div>
      </div>

      {/* Center: Live Expiration Countdown */}
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <Clock className="h-3.5 w-3.5 text-amber-900" />
        <span className="text-amber-950/80">Expires in:</span>
        <span
          className={`font-bold px-1.5 py-0.5 rounded ${
            isExpiringSoon
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-amber-600/30 text-amber-950'
          }`}
        >
          {formattedTime}
        </span>
      </div>

      {/* Right: Operator Identity & Action Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-amber-950/80 hidden lg:inline mr-2">
          Operator: <span className="font-semibold">{impersonation.superAdminEmail}</span>
        </span>

        {isSuperAdminRoute && (
          <Link
            href="/dashboard"
            className="h-7 px-2.5 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-xs rounded flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open Studio Workspace</span>
          </Link>
        )}

        <Button
          size="sm"
          onClick={handleExit}
          disabled={isPending}
          className="h-7 px-2.5 text-xs font-semibold bg-amber-950 text-amber-50 hover:bg-black hover:text-white shadow-xs border border-amber-900 transition-colors flex items-center gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>{isSuperAdminRoute ? 'End Support Session' : 'Exit to Super Admin'}</span>
        </Button>
      </div>
    </div>
  );
}
