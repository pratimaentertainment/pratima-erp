import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';

export async function seedBranch(tenantId: string) {
  logger.info(`Seeding default Branch for tenant ${tenantId}...`);
  
  const branchCode = 'HQ';
  
  let branch = await prisma.branch.findFirst({
    where: { tenantId, code: branchCode }
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId,
        code: branchCode,
        name: 'Headquarters',
        shortName: 'HQ',
        country: 'US',
      }
    });
    logger.success(`Created Default Branch: ${branch.name} (${branch.id})`);
  } else {
    logger.info(`Default Branch already exists: ${branch.id}`);
  }

  return branch;
}
