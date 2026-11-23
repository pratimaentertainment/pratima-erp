export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'EXPORT';
  actorId: string;
  timestamp: Date;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

export interface AuditService {
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void>;
  getHistory(entityType: string, entityId: string): Promise<AuditEvent[]>;
}

export class BaseAuditService implements AuditService {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    // Abstraction for Prisma Audit table insert
    console.log('[Audit Log]', event.action, event.entityType, event.entityId);
  }

  async getHistory(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return [];
  }
}
