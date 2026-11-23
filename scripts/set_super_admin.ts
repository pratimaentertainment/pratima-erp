import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@pratimaerp.com';
  console.log(`[SuperAdminSetup] Setting up ${email}...`);

  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'SUPER_ADMIN',
        tenantId: null,
        status: 'ACTIVE',
        isActive: true,
        canLogin: true,
      },
    });
    console.log(`[SuperAdminSetup] Successfully updated existing user ${user.email} (ID: ${user.id}) to SUPER_ADMIN with tenantId=null.`);
  } else {
    const passwordHash = await bcrypt.hash('admin123', 10);
    user = await prisma.user.create({
      data: {
        email,
        name: 'Master Super Admin',
        passwordHash,
        role: 'SUPER_ADMIN',
        tenantId: null,
        status: 'ACTIVE',
        isActive: true,
        canLogin: true,
      },
    });
    console.log(`[SuperAdminSetup] Created new master Super Admin user ${user.email} (ID: ${user.id}) with tenantId=null.`);
  }
}

main()
  .catch((e) => {
    console.error('[SuperAdminSetup] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect?.();
    process.exit(0);
  });
