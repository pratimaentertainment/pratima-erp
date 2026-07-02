 
 
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RoleRepository {
  static async findAll(tenantId: string) {
    return prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
