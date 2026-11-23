import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';

export async function seedTenant() {
  logger.info('Seeding default Tenant...');
  
  const subdomain = 'hq';
  
  // Try to find an existing tenant using the default subdomain to make it idempotent
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'System Default Enterprise',
        subdomain,
        slug: 'system-default-enterprise',
        contactPhone: '+919999999999',
        companyLegalName: 'Pratima Entertainment',
        isActive: true,
      }
    });
    logger.success(`Created Default Tenant: ${tenant.name} (${tenant.id})`);
  } else {
    logger.info(`Default Tenant already exists: ${tenant.id}`);
  }

  return tenant;
}
