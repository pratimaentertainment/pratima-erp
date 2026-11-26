import { LeadService } from '@/services/lead.service';
import { prisma } from '@/lib/prisma';
import { LeadClient, type SerializedLead } from './lead-client';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { serializePrisma } from '@/lib/serialize';

export default async function LeadsPage() {
  const session = await auth();
  const user = session?.user as any;
  const context = await getActiveContext();

  const isFranchisor = Boolean(context?.tenant?.isFranchisor || user?.role === 'SUPER_ADMIN');

  // Parallelize all 4 independent database queries with lean select projections
  const [rawLeads, users, packages, rawFranchisees] = await Promise.all([
    LeadService.findAll(context),
    user?.tenantId
      ? prisma.user.findMany({
          where: { tenantId: user.tenantId, deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    user?.tenantId
      ? prisma.package.findMany({
          where: { tenantId: user.tenantId },
          select: {
            id: true,
            name: true,
            basePrice: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    isFranchisor && user?.tenantId
      ? prisma.tenant.findMany({
          where: { parentTenantId: user.tenantId, deletedAt: null },
          select: { id: true, name: true, city: true, state: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  // Explicit Decimal-to-number mapping to prevent Next.js Server-to-Client serialization errors
  const leads: SerializedLead[] = (Array.isArray(rawLeads) ? rawLeads : []).map((lead: any) => ({
    ...lead,
    expectedRevenue: lead.expectedRevenue !== null && lead.expectedRevenue !== undefined
      ? (typeof lead.expectedRevenue?.toNumber === 'function'
          ? lead.expectedRevenue.toNumber()
          : Number(lead.expectedRevenue) || 0)
      : 0,
    package: lead.package
      ? {
          ...lead.package,
          basePrice: lead.package.basePrice !== null && lead.package.basePrice !== undefined
            ? (typeof lead.package.basePrice?.toNumber === 'function'
                ? lead.package.basePrice.toNumber()
                : Number(lead.package.basePrice) || 0)
            : 0,
        }
      : null,
    quotations: Array.isArray(lead.quotations)
      ? lead.quotations.map((q: any) => ({
          ...q,
          totalAmount: q.totalAmount !== null && q.totalAmount !== undefined
            ? (typeof q.totalAmount?.toNumber === 'function'
                ? q.totalAmount.toNumber()
                : Number(q.totalAmount) || 0)
            : 0,
        }))
      : [],
  }));

  const serializedPackages = packages.map((pkg: any) => ({
    ...pkg,
    basePrice: pkg.basePrice !== null && pkg.basePrice !== undefined
      ? (typeof pkg.basePrice?.toNumber === 'function'
          ? pkg.basePrice.toNumber()
          : Number(pkg.basePrice) || 0)
      : 0,
  }));

  const formattedFranchisees = rawFranchisees.map((f: any) => ({
    id: f.id,
    name: f.name,
    city: f.city || undefined,
    state: f.state || undefined,
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage your sales pipeline and conversions.</p>
        </div>
      </div>
      <LeadClient
        initialData={serializePrisma(leads)}
        users={serializePrisma(users)}
        packages={serializePrisma(serializedPackages)}
        franchisees={formattedFranchisees}
      />
    </div>
  );
}
