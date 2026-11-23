import { prisma } from '../../../src/lib/prisma';
import { logger } from '../shared/logger';

export async function seedMasterData(tenantId: string) {
  logger.info('Seeding master data...');
  let createdCount = 0;

  // 1. States
  const states = [
    { name: 'Maharashtra', code: 'MH' },
    { name: 'Delhi', code: 'DL' },
    { name: 'Karnataka', code: 'KA' },
  ];
  for (const state of states) {
    const record = await prisma.state.upsert({
      where: { tenantId_code: { tenantId, code: state.code } },
      update: { name: state.name },
      create: { tenantId, code: state.code, name: state.name }
    });
    createdCount++;

    // Cities
    const cities = state.code === 'MH' ? ['Mumbai', 'Pune', 'Nagpur'] :
                   state.code === 'DL' ? ['New Delhi', 'Gurugram', 'Noida'] :
                   state.code === 'KA' ? ['Bengaluru', 'Mysuru', 'Mangaluru'] : [];
    
    for (const city of cities) {
      // City doesn't have a code, so we upsert by checking if it exists
      const existingCity = await prisma.city.findFirst({
        where: { tenantId, stateId: record.id, name: city }
      });
      if (!existingCity) {
        await prisma.city.create({
          data: { tenantId, stateId: record.id, name: city }
        });
        createdCount++;
      }
    }
  }

  // 2. Lead Sources
  const leadSources = [
    { name: 'Website', code: 'WEB', description: 'Direct Website Lead' },
    { name: 'Instagram', code: 'IG', description: 'Instagram Lead' },
    { name: 'Referral', code: 'REF', description: 'Referral Lead' },
  ];
  for (const source of leadSources) {
    await prisma.leadSource.upsert({
      where: { tenantId_code: { tenantId, code: source.code } },
      update: { name: source.name, description: source.description },
      create: { tenantId, code: source.code, name: source.name, description: source.description }
    });
    createdCount++;
  }

  // 3. Event Types
  const eventTypes = [
    { name: 'Wedding', code: 'WED', description: 'Wedding Ceremony', color: '#ff6b6b' },
    { name: 'Pre-Wedding', code: 'PREWED', description: 'Pre-Wedding Shoot', color: '#4dabf7' },
    { name: 'Maternity', code: 'MAT', description: 'Maternity Shoot', color: '#ffd43b' },
  ];
  for (const ev of eventTypes) {
    await prisma.eventType.upsert({
      where: { tenantId_code: { tenantId, code: ev.code } },
      update: { name: ev.name, description: ev.description, color: ev.color },
      create: { tenantId, code: ev.code, name: ev.name, description: ev.description, color: ev.color }
    });
    createdCount++;
  }

  // 4. Package Categories
  const packageCategories = [
    { name: 'Photography', code: 'PHOTO', description: 'Photography Packages' },
    { name: 'Videography', code: 'VIDEO', description: 'Videography Packages' },
    { name: 'Combo', code: 'COMBO', description: 'Combo Packages' },
  ];
  for (const cat of packageCategories) {
    await prisma.packageCategory.upsert({
      where: { tenantId_code: { tenantId, code: cat.code } },
      update: { name: cat.name, description: cat.description },
      create: { tenantId, code: cat.code, name: cat.name, description: cat.description }
    });
    createdCount++;
  }

  // 5. Payment Modes

  // 6. Tax Rates
  const taxRates = [
    { name: 'GST 0%', code: 'GST0', percentage: 0 },
    { name: 'GST 5%', code: 'GST5', percentage: 5 },
    { name: 'GST 12%', code: 'GST12', percentage: 12 },
    { name: 'GST 18%', code: 'GST18', percentage: 18 },
  ];
  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: { tenantId_code: { tenantId, code: tax.code } },
      update: { name: tax.name, percentage: tax.percentage },
      create: { tenantId, code: tax.code, name: tax.name, percentage: tax.percentage }
    });
    createdCount++;
  }

  // 7. Service Components
  const serviceComponents = [
    { name: 'Candid Photography', code: 'CANDID', description: 'Candid Photography per day' },
    { name: 'Traditional Photography', code: 'TRADITIONAL_PHOTO', description: 'Traditional Photography per day' },
    { name: 'Cinematography', code: 'CINEMATOGRAPHY', description: 'Cinematic video' },
    { name: 'Traditional Videography', code: 'TRADITIONAL_VIDEO', description: 'Traditional Videography' },
    { name: 'Drone', code: 'DRONE', description: 'Drone coverage' },
    { name: 'Album 40 Pages', code: 'ALBUM_40', description: 'Premium Photobook 40 Pages' },
  ];
  for (const comp of serviceComponents) {
    await prisma.serviceComponent.upsert({
      where: { tenantId_code: { tenantId, code: comp.code } },
      update: { name: comp.name, description: comp.description },
      create: { tenantId, code: comp.code, name: comp.name, description: comp.description }
    });
    createdCount++;
  }

  logger.info(`Finished seeding master data. Records processed: ${createdCount}`);
}
