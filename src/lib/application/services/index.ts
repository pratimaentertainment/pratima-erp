import { EventBus } from '../events';
import { AuditService } from '../audit';
import { CacheClient } from '../cache';
import { BaseRepository } from '../repositories';

export interface ServiceContext {
  userId: string;
  tenantId?: string;
  roles: string[];
}

export abstract class BaseService<Entity, DTO> {
  constructor(
    protected readonly repository: BaseRepository<Entity>,
    protected readonly eventBus: EventBus,
    protected readonly audit: AuditService,
    protected readonly cache: CacheClient
  ) {}

  protected assertContext(ctx?: ServiceContext) {
    if (!ctx || !ctx.userId) {
      throw new Error('Service context is required and must contain userId');
    }
  }
}
