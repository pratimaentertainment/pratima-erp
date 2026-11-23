'use client';

import * as React from 'react';
import { useState } from 'react';
import { Megaphone, ShieldCheck, History, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BroadcastDesk, type BroadcastItem } from './broadcast-desk';
import { AuditLogViewer, type AuditLogItem } from './audit-log-viewer';

interface GovernanceWorkspaceProps {
  initialBroadcasts: BroadcastItem[];
  initialAuditLogs: AuditLogItem[];
  totalAuditCount: number;
}

export function GovernanceWorkspace({
  initialBroadcasts,
  initialAuditLogs,
  totalAuditCount,
}: GovernanceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'audit-logs'>('broadcasts');

  const liveBroadcastsCount = initialBroadcasts.filter(
    (b) => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date())
  ).length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'broadcasts'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          <span>System Broadcast Desk</span>
          {liveBroadcastsCount > 0 && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-mono font-bold ${
                activeTab === 'broadcasts'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
              }`}
            >
              {liveBroadcastsCount} Live
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit-logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'audit-logs'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Global Security Audit Logs</span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 font-mono ${
              activeTab === 'audit-logs'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {totalAuditCount} Events
          </Badge>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'broadcasts' ? (
        <BroadcastDesk initialBroadcasts={initialBroadcasts} />
      ) : (
        <AuditLogViewer initialLogs={initialAuditLogs} totalCount={totalAuditCount} />
      )}
    </div>
  );
}
