import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding new Lead Sources...');
  
  // Find the first tenant (assuming Pratima Studio)
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'Pratima Studio' }
  });

  if (!tenant) {
    console.error("Default tenant not found. Run main seed first.");
    process.exit(1);
  }

  const sources = [
    'FACEBOOK_ADS',
    'GOOGLE_ADS',
    'WEDMEGOOD',
    'JUSTDIAL',
    'REFERRAL'
  ];

  for (const source of sources) {
    const existing = await prisma.leadSource.findFirst({
      where: { name: source, tenantId: tenant.id }
    });

    if (!existing) {
      await prisma.leadSource.create({
        data: {
          tenantId: tenant.id,
          name: source,
          code: source,
          isActive: true
        }
      });
      console.log(`Created LeadSource: ${source}`);
    } else {
      console.log(`LeadSource ${source} already exists.`);
    }
  }

  console.log('Finished seeding Lead Sources.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
