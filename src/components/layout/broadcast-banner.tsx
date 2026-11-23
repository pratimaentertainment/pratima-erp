'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BroadcastData {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  expiresAt?: string | null;
  createdAt: string;
}

interface BroadcastBannerProps {
  broadcast: BroadcastData;
}

export function BroadcastBanner({ broadcast }: BroadcastBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // default hidden until hydration check

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`pratima_broadcast_dismissed_${broadcast.id}`);
      if (dismissed !== 'true') {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [broadcast.id]);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(`pratima_broadcast_dismissed_${broadcast.id}`, 'true');
    } catch {
      // ignore storage error
    }
    setIsDismissed(true);
  };

  const severityStyles = {
    CRITICAL: {
      bar: 'bg-rose-600 text-white border-b border-rose-700',
      badge: 'bg-white/20 text-white border-white/30',
      icon: AlertOctagon,
      label: 'Critical Platform Alert',
    },
    WARNING: {
      bar: 'bg-amber-500 text-amber-950 border-b border-amber-600/40',
      badge: 'bg-amber-950/20 text-amber-950 border-amber-950/30',
      icon: AlertTriangle,
      label: 'System Maintenance Notice',
    },
    INFO: {
      bar: 'bg-blue-600 text-white border-b border-blue-700',
      badge: 'bg-white/20 text-white border-white/30',
      icon: Megaphone,
      label: 'System Announcement',
    },
  };

  const current = severityStyles[broadcast.severity] || severityStyles.INFO;
  const IconComponent = current.icon;

  return (
    <div
      role="region"
      aria-label="System Broadcast"
      className={`${current.bar} px-4 py-2 shadow-xs transition-all z-40 select-none text-xs sm:text-sm`}
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="p-1 rounded bg-black/10 shrink-0 mt-0.5 sm:mt-0">
            <IconComponent className="h-4 w-4" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <span className="font-bold tracking-tight shrink-0">{broadcast.title}</span>
            <span className="hidden sm:inline opacity-60">•</span>
            <p className="text-xs opacity-95 truncate sm:overflow-visible sm:whitespace-normal font-normal">
              {broadcast.message}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-black/10 text-current rounded shrink-0"
          title="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
