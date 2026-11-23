import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';
import { PERMISSIONS } from './definitions';

export async function seedPermissions() {
  logger.info('Seeding permissions...');
  let createdCount = 0;
  
  for (const perm of PERMISSIONS) {
    const name = `${perm.action} ${perm.module}`;
    
    // We check existence manually or use upsert. Using manual check to match legacy but can use upsert safely.
    // The requirement is "Use upsert", so we will use upsert.
    // However, Prisma upsert requires a unique identifier. The `Permission` table might not have a composite unique on [module, action].
    // Let's check if it does. If not, fallback to findFirst then create.
    const existing = await prisma.permission.findFirst({
      where: { module: perm.module, action: perm.action }
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          name,
          module: perm.module,
          action: perm.action
        }
      });
      createdCount++;
      logger.success(`Created Permission: ${name}`);
    } else {
      // update existing if needed
      await prisma.permission.update({
        where: { id: existing.id },
        data: { name }
      });
    }
  }
  
  logger.info(`Finished seeding permissions. ${createdCount} created.`);
}
