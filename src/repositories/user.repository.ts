 
 
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class UserRepository {
  static async findAll(tenantId: string, params: { skip?: number; take?: number; search?: string; status?: string; roleId?: string }) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.status) {
      where.status = params.status as any;
    }

    if (params.roleId) {
      where.roles = {
        some: {
          roleId: params.roleId,
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        include: {
          roles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  static async findById(tenantId: string, id: string) {
    return prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        branches: { include: { branch: true } },
      },
    });
  }

  static async create(data: Prisma.UserUncheckedCreateInput, roles: string[], branches: string[]) {
    return prisma.user.create({
      data: {
        ...data,
        roles: {
          create: roles.map((roleId) => ({ roleId })),
        },
        branches: {
          create: branches.map((branchId, index) => ({ branchId, isPrimary: index === 0 })),
        },
      },
      include: {
        roles: true,
        branches: true,
      },
    });
  }

  static async update(tenantId: string, id: string, data: Prisma.UserUncheckedUpdateInput, roles?: string[], branches?: string[]) {
    return prisma.$transaction(async (tx) => {
      if (roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        data.roles = {
          create: roles.map((roleId) => ({ roleId })),
        };
      }
      
      if (branches) {
        await tx.userBranch.deleteMany({ where: { userId: id } });
        data.branches = {
          create: branches.map((branchId, index) => ({ branchId, isPrimary: index === 0 })),
        };
      }

      return tx.user.update({
        where: { id, tenantId },
        data,
      });
    });
  }

  static async softDelete(tenantId: string, id: string) {
    return prisma.user.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
