import { prisma } from '@/lib/prisma';
import { MasterEntityName } from '@/lib/master-config';

export class MasterRepository {
  static async findAll(tenantId: string, entity: MasterEntityName) {
    const delegate = prisma[entity] as any;
    
    // For City, we need to include State for the table view
    const include = entity === 'city' ? { state: true } : undefined;
    
    return delegate.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include
    });
  }

  static async findById(tenantId: string, entity: MasterEntityName, id: string) {
    const delegate = prisma[entity] as any;
    return delegate.findUnique({
      where: { id, tenantId }
    });
  }

  static async create(tenantId: string, entity: MasterEntityName, data: any) {
    const delegate = prisma[entity] as any;
    return delegate.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  static async update(tenantId: string, entity: MasterEntityName, id: string, data: any) {
    const delegate = prisma[entity] as any;
    return delegate.update({
      where: { id, tenantId },
      data
    });
  }

  static async softDelete(tenantId: string, entity: MasterEntityName, id: string) {
    const delegate = prisma[entity] as any;
    return delegate.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() }
    });
  }

  // Get active items for dropdowns
  static async getActiveOptions(tenantId: string, entity: MasterEntityName) {
    const delegate = prisma[entity] as any;
    return delegate.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true }
    });
  }
}
