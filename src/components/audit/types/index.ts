import * as React from 'react';

export interface AuditFieldDiff {
  field: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
}

export interface AuditRecordType {
  id: string;
  entityId: string;
  entityType: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'status_change';
  timestamp: string | Date;
  actor: {
    id: string;
    name: string;
  };
  diffs?: AuditFieldDiff[];
  metadata?: Record<string, any>;
  ipAddress?: string;
}
