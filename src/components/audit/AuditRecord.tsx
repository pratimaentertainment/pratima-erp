import * as React from 'react';
import { cn } from '@/lib/utils';
import { Shield, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/badges/Badge';
import type { AuditRecordType } from './types';

interface AuditRecordProps {
  record: AuditRecordType;
  className?: string;
}

export function AuditRecord({ record, className }: AuditRecordProps) {
  const getActionColor = (action: string) => {
    switch(action) {
      case 'create': return 'bg-success/10 text-success border-success/20';
      case 'delete': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'update': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={cn("p-4 border rounded-md flex flex-col gap-3 bg-background", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{record.actor.name}</span>
          <span className="text-muted-foreground">performed</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider", getActionColor(record.action))}>
            {record.action}
          </span>
        </div>
        <time className="text-xs text-muted-foreground" suppressHydrationWarning>
          {new Date(record.timestamp).toLocaleString()}
        </time>
      </div>

      {record.diffs && record.diffs.length > 0 && (
        <div className="mt-2 text-sm border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 bg-muted/50 p-2 border-b font-medium text-xs text-muted-foreground uppercase">
            <div className="col-span-3">Field</div>
            <div className="col-span-4">Previous Value</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">New Value</div>
          </div>
          {record.diffs.map((diff, idx) => (
            <div key={idx} className="grid grid-cols-12 p-2 border-b last:border-0 items-center">
              <div className="col-span-3 font-medium text-muted-foreground">{diff.field}</div>
              <div className="col-span-4 font-mono text-xs text-destructive/80 truncate bg-destructive/5 px-2 py-1 rounded">
                {String(diff.oldValue ?? 'null')}
              </div>
              <div className="col-span-1 flex justify-center text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
              </div>
              <div className="col-span-4 font-mono text-xs text-success/80 truncate bg-success/5 px-2 py-1 rounded">
                {String(diff.newValue ?? 'null')}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {record.ipAddress && (
        <div className="text-xs text-muted-foreground mt-1 flex justify-end">
          IP: {record.ipAddress}
        </div>
      )}
    </div>
  );
}
