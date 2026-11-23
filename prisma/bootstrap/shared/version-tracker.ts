import { prisma } from '../../../src/lib/prisma';
import { logger } from './logger';

export const BOOTSTRAP_VERSION = '1.0.0';

export async function updateBootstrapVersion(tenantId: string) {
  logger.info(`Updating bootstrap version to ${BOOTSTRAP_VERSION}`);
  
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const currentPrefs = typeof (tenant as any).preferences === 'object' && (tenant as any).preferences !== null 
    ? (tenant as any).preferences as Record<string, any>
    : {};
  
  const newPrefs = {
    ...currentPrefs,
    bootstrapVersion: BOOTSTRAP_VERSION,
    lastBootstrapAt: new Date().toISOString(),
  };

  await (prisma.tenant as any).update({
    where: { id: tenantId },
    data: { preferences: newPrefs }
  });

  logger.success('Bootstrap version tracked successfully.');
}
