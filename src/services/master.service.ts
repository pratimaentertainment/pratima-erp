import { MasterRepository } from '@/repositories/master.repository';
import { MasterEntityName } from '@/lib/master-config';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export class MasterService {
  static async validateSession() {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) throw new Error("Unauthorized");
    
    // In a real implementation, we would validate 'Master Data' permissions here.
    return {
      tenantId: user.tenantId,
      userId: user.id
    };
  }

  static async logAction(tx: any, tenantId: string, userId: string, entityType: string, entityId: string, action: string, oldValues?: any, newValues?: any) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType,
        entityId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
      }
    });
  }

  static async findAll(ctxOrEntity: any, maybeEntity?: MasterEntityName) {
    let tenantId: string;
    let entity: MasterEntityName;

    if (maybeEntity) {
      tenantId = typeof ctxOrEntity === 'string' ? ctxOrEntity : ctxOrEntity?.tenantId;
      entity = maybeEntity;
    } else {
      entity = ctxOrEntity as MasterEntityName;
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
    }

    return MasterRepository.findAll(tenantId, entity);
  }

  static async findAllActive(ctxOrEntity: any, maybeEntity?: MasterEntityName) {
    let tenantId: string;
    let entity: MasterEntityName;

    if (maybeEntity) {
      tenantId = typeof ctxOrEntity === 'string' ? ctxOrEntity : ctxOrEntity?.tenantId;
      entity = maybeEntity;
    } else {
      entity = ctxOrEntity as MasterEntityName;
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
    }

    return MasterRepository.getActiveOptions(tenantId, entity);
  }

  static async findById(entity: MasterEntityName, id: string) {
    const { tenantId } = await this.validateSession();
    return MasterRepository.findById(tenantId, entity, id);
  }

  static async create(entity: MasterEntityName, data: any) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const delegate = tx[entity] as any;
      const created = await delegate.create({
        data: {
          ...data,
          tenantId
        }
      });

      await this.logAction(tx, tenantId, userId, entity, created.id, 'CREATE', null, created);
      return created;
    });
  }

  static async update(entity: MasterEntityName, id: string, data: any) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const delegate = tx[entity] as any;
      const old = await delegate.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error("Not found");

      const updated = await delegate.update({
        where: { id, tenantId },
        data
      });

      await this.logAction(tx, tenantId, userId, entity, updated.id, 'UPDATE', old, updated);
      return updated;
    });
  }

  static async softDelete(entity: MasterEntityName, id: string) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const delegate = tx[entity] as any;
      const old = await delegate.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error("Not found");

      const deleted = await delegate.update({
        where: { id, tenantId },
        data: { deletedAt: new Date() }
      });

      await this.logAction(tx, tenantId, userId, entity, deleted.id, 'DELETE', old, null);
      return true;
    });
  }
}
