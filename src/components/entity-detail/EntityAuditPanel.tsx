import * as React from 'react';
import { cn } from '@/lib/utils';
import { EntityInfoGrid } from './EntityInfoGrid';
import { ShieldAlert, User, Clock } from 'lucide-react';

export interface EntityAuditInfo {
  createdBy: string;
  createdAt: string | Date;
  updatedBy?: string;
  updatedAt?: string | Date;
  version?: number | string;
}

interface EntityAuditPanelProps {
  audit: EntityAuditInfo;
  className?: string;
}

export function EntityAuditPanel({ audit, className }: EntityAuditPanelProps) {
  return (
    <EntityInfoGrid title="System Audit" className={className}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 text-sm">
          <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-medium">Created by {audit.createdBy}</span>
            <span className="text-muted-foreground" suppressHydrationWarning>
              {new Date(audit.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        
        {audit.updatedBy && audit.updatedAt && (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-medium">Last modified by {audit.updatedBy}</span>
              <span className="text-muted-foreground" suppressHydrationWarning>
                {new Date(audit.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {audit.version !== undefined && (
          <div className="flex items-start gap-3 text-sm">
            <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-medium">System Version</span>
              <span className="text-muted-foreground">v{audit.version}</span>
            </div>
          </div>
        )}
      </div>
    </EntityInfoGrid>
  );
}
