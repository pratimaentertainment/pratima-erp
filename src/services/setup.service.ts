import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SetupInput } from '@/lib/validations/setup.schema';

export class SetupService {
  /**
   * Checks if the system is already initialized by checking if any Tenant exists.
   */
  static async isSystemInitialized(): Promise<boolean> {
    const tenantCount = await prisma.tenant.count();
    return tenantCount > 0;
  }

  /**
   * Bootstraps the initial system with the first Tenant, Branch, and Super Admin.
   * Runs in a single transaction.
   */
  static async bootstrapSystem(data: SetupInput, ipAddress?: string) {
    if (await this.isSystemInitialized()) {
      throw new Error('System is already initialized.');
    }

    // Hash the password before the transaction
    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          currency: data.currency,
          country: data.country,
          timezone: data.timezone,
        },
      });

      // 2. Create Headquarters Branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: data.branchName,
          timezone: data.timezone,
        },
      });

      // 3. Create SUPER_ADMIN Role
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'SUPER_ADMIN',
          description: 'System Administrator with full access',
          isSystem: true,
        },
      });

      // Note: In a full system, you'd insert default permissions into RolePermission here.

      // 4. Create First User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.adminName,
          email: data.adminEmail,
          phone: data.mobileNumber,
          passwordHash,
          status: 'ACTIVE', // Override default PENDING_INVITATION
          roles: {
            create: { roleId: role.id },
          },
          branches: {
            create: { branchId: branch.id, isPrimary: true },
          },
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'SYSTEM_INITIALIZED',
          entityType: 'System',
          entityId: tenant.id,
          ipAddress,
        },
      });

      return { tenant, user };
    });
  }
}
