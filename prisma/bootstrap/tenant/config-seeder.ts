import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';
import { BOOTSTRAP_VERSION } from '../shared/version-tracker';

export async function seedConfiguration(tenantId: string) {
  logger.info(`Seeding Configuration for tenant ${tenantId}...`);

  // Update tenant direct fields for configuration
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { 
      // Add any direct fields here if needed
    }
  });

  // Number Series setup
  const prefixes = [
    { entityType: 'QUOTATION', prefix: 'QT-' },
    { entityType: 'INVOICE', prefix: 'INV-' },
    { entityType: 'ALBUM', prefix: 'ALB-' }
  ];

  for (const p of prefixes) {
    const existing = await prisma.numberSeries.findFirst({
      where: { tenantId, entityType: p.entityType }
    });

    if (!existing) {
      await prisma.numberSeries.create({
        data: {
          tenantId,
          entityType: p.entityType,
          prefix: p.prefix,
          nextNumber: 1
        }
      });
      logger.info(`Created NumberSeries for ${p.entityType} with prefix ${p.prefix}`);
    }
  }

  // Update preferences JSON for extended configuration
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const currentPrefs = typeof (tenant as any)?.preferences === 'object' && (tenant as any)?.preferences !== null 
    ? (tenant as any).preferences as Record<string, any>
    : {};

  const newPrefs = {
    ...currentPrefs,
    dateFormat: 'YYYY-MM-DD',
    storageConfiguration: {
      provider: 'local',
      uploadLimitMB: 50
    },
    bootstrapVersion: BOOTSTRAP_VERSION
  };

  await (prisma.tenant as any).update({
    where: { id: tenantId },
    data: { preferences: newPrefs }
  });

  logger.success('Tenant configuration seeded.');
}
