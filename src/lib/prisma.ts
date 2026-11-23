 
 
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/env';
import 'dotenv/config'; // Ensure dotenv is loaded so process.env.DATABASE_URL is available

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

export const prisma = new Proxy(rawPrisma, {
  get(target, prop, receiver) {
    if (prop === 'role') {
      return (target as any).tenantRole;
    }
    return Reflect.get(target, prop, receiver);
  },
}) as PrismaClient & { role: any };

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
