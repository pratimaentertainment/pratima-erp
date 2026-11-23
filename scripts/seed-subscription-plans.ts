import { prisma } from '../src/lib/prisma';

async function seedPlans() {
  console.log('Seeding SaaS Subscription Plans...');

  const plans = [
    {
      slug: 'studio-starter',
      name: 'Starter Solo',
      monthlyPrice: 1999,
      annualPrice: 19999,
      maxBranches: 1,
      maxStaff: 3,
      smsCredits: 100,
      whatsappCredits: 500,
      isActive: true,
    },
    {
      slug: 'studio-pro',
      name: 'Studio Pro',
      monthlyPrice: 4999,
      annualPrice: 49999,
      maxBranches: 3,
      maxStaff: 10,
      smsCredits: 500,
      whatsappCredits: 2500,
      isActive: true,
    },
    {
      slug: 'cinema-enterprise',
      name: 'Cinema Enterprise',
      monthlyPrice: 9999,
      annualPrice: 99999,
      maxBranches: 10,
      maxStaff: 50,
      smsCredits: 2000,
      whatsappCredits: 10000,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug: plan.slug },
    });

    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { slug: plan.slug },
        data: plan,
      });
      console.log(`Updated plan: ${plan.name} (${plan.slug})`);
    } else {
      await prisma.subscriptionPlan.create({
        data: plan,
      });
      console.log(`Created plan: ${plan.name} (${plan.slug})`);
    }
  }

  const allPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  });

  console.log(`Successfully seeded ${allPlans.length} active subscription plans:`);
  allPlans.forEach((p) => {
    console.log(` - ${p.name} (₹${p.monthlyPrice}/mo, ₹${p.annualPrice}/yr) [ID: ${p.id}]`);
  });
}

seedPlans()
  .catch((e) => {
    console.error('Failed to seed plans:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
