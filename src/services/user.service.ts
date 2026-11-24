import { UserRepository } from '@/repositories/user.repository';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { assertStaffQuota } from '@/services/billing/entitlement.service';

export class UserService {
  static async getUsers(tenantId: string, params: { skip?: number; take?: number; search?: string; status?: string; roleId?: string }) {
    return UserRepository.findAll(tenantId, params);
  }

  static async findActiveUsers(ctx: any) {
    return prisma.user.findMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true, email: true }
    });
  }

  static async getUser(tenantId: string, id: string) {
    return UserRepository.findById(tenantId, id);
  }

  static async findById(ctx: any, id: string) {
    return UserRepository.findById(ctx.tenantId, id);
  }

  static async createUser(
    tenantId: string,
    performedBy: string | null,
    data: any,
    roles: string[],
    branches: string[],
    ipAddress?: string
  ) {
    // 1. Enforce SaaS Plan Staff Quota
    await assertStaffQuota(tenantId);

    const passwordHash = await bcrypt.hash(data.password, 10);
    
    // Omit plaintext password and map to DB schema
    const { password, ...rest } = data;
    
    const userPayload: Prisma.UserUncheckedCreateInput = {
      ...rest,
      tenantId,
      passwordHash,
    };

    const user = await UserRepository.create(userPayload, roles, branches);

    // Record Password History
    await prisma.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });

    // Audit Log
    if (performedBy) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'CREATE_USER',
          entityType: 'User',
          entityId: user.id,
          newValues: userPayload as any,
          ipAddress,
        },
      });
    }

    return user;
  }

  static async updateUser(
    tenantId: string,
    id: string,
    performedBy: string | null,
    data: any,
    roles?: string[],
    branches?: string[],
    ipAddress?: string
  ) {
    const oldUser = await UserRepository.findById(tenantId, id);
    if (!oldUser) throw new Error('User not found');

    const { password, ...restData } = data;
    const updatePayload: Prisma.UserUncheckedUpdateInput = { ...restData };

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updatePayload.passwordHash = passwordHash;

      // Record Password History
      await prisma.passwordHistory.create({
        data: {
          userId: id,
          passwordHash,
        },
      });
    }

    const updatedUser = await UserRepository.update(tenantId, id, updatePayload, roles, branches);

    // Audit Log
    if (performedBy) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'UPDATE_USER',
          entityType: 'User',
          entityId: id,
          oldValues: oldUser as any,
          newValues: updatedUser as any,
          ipAddress,
        },
      });
    }

    return updatedUser;
  }

  static async deleteUser(tenantId: string, id: string, performedBy: string | null, ipAddress?: string) {
    const deletedUser = await UserRepository.softDelete(tenantId, id);

    // Audit Log
    if (performedBy) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'DELETE_USER',
          entityType: 'User',
          entityId: id,
          ipAddress,
        },
      });
    }

    return deletedUser;
  }

  static async toggleUserStatus(tenantId: string, id: string, status: string, performedBy: string | null, ipAddress?: string) {
    const updatedUser = await UserRepository.update(tenantId, id, { status: status as any });

    if (performedBy) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'UPDATE_USER_STATUS',
          entityType: 'User',
          entityId: id,
          newValues: { status },
          ipAddress,
        },
      });
    }

    return updatedUser;
  }
}
