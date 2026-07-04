import { prisma } from '@/lib/prisma';
import { TenantUpdateInput } from '@/lib/validations/tenant.schema';

export class TenantRepository {
  static async getTenantProfile(tenantId: string) {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  static async updateTenantProfile(tenantId: string, data: TenantUpdateInput) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }
}
