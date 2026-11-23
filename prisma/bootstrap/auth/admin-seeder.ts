import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';
import bcrypt from 'bcryptjs';

export async function seedAdmin(tenantId: string, branchId: string, roleId: string, envContext: any) {
  logger.info(`Seeding Admin User for tenant ${tenantId}...`);

  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@pratima.local';
  let password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    if (envContext.isProduction) {
      logger.error('CRITICAL: SUPER_ADMIN_PASSWORD is required in production environment.');
      process.exit(1);
    } else {
      logger.warn('SUPER_ADMIN_PASSWORD not set. Using default "admin" for development/staging.');
      password = 'admin';
    }
  }

  let user = await prisma.user.findFirst({
    where: { tenantId, email }
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name: 'System Administrator',
        passwordHash,
        status: 'ACTIVE',
        isLocked: false
      }
    });
    logger.success(`Created Admin User: ${user.email}`);

    // Link Role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId
      }
    });
    logger.info('Linked Admin User to Super Admin Role');

    // Link Branch
    await prisma.userBranch.create({
      data: {
        userId: user.id,
        branchId
      }
    });
    logger.info('Linked Admin User to Headquarters Branch');
  } else {
    logger.info(`Admin User ${email} already exists.`);
  }

  return user;
}
