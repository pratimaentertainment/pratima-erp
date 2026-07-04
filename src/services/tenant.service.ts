import { TenantRepository } from '@/repositories/tenant.repository';
import { TenantUpdateInput } from '@/lib/validations/tenant.schema';
import { prisma } from '@/lib/prisma';

export class TenantService {
  static async updateTenantProfile(tenantId: string, userId: string, data: TenantUpdateInput) {
    return prisma.$transaction(async (tx) => {
      // Find existing tenant
      const oldTenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!oldTenant) throw new Error('Tenant not found');

      // Update tenant
      const newTenant = await tx.tenant.update({
        where: { id: tenantId },
        data,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'TENANT_UPDATED',
          entityType: 'Tenant',
          entityId: tenantId,
          oldValues: oldTenant as any,
          newValues: newTenant as any,
        }
      });

      return newTenant;
    });
  }

  static async getTenantProfile(tenantId: string) {
    return TenantRepository.getTenantProfile(tenantId);
  }
}
