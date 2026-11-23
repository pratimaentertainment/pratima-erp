import * as React from 'react';
import { cn } from '@/lib/utils';
import { AuditRecord } from './AuditRecord';
import type { AuditRecordType } from './types';
import { ShieldAlert } from 'lucide-react';

interface AuditHistoryProps {
  records: AuditRecordType[];
  className?: string;
}

export function AuditHistory({ records, className }: AuditHistoryProps) {
  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-md bg-muted/10">
        <ShieldAlert className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {records.map((record) => (
        <AuditRecord key={record.id} record={record} />
      ))}
    </div>
  );
}
