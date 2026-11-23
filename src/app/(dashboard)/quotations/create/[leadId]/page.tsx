import { notFound } from 'next/navigation';
import { LeadService } from '@/services/lead.service';
import { PackageService } from '@/services/package.service';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { QuotationCreateForm } from './quotation-create-form';

export const dynamic = 'force-dynamic';

export default async function QuotationCreateByLeadPage(props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const ctx = await buildContextAndAuthorize();

  const lead = await LeadService.findById(ctx.tenantId, ctx.branchId || null, params.leadId);
  if (!lead) {
    notFound();
  }

  let packages: any[] = [];
  try {
    const rawPackages = await PackageService.findAll(ctx);
    const list = Array.isArray(rawPackages) ? rawPackages : (rawPackages?.packages || []);
    packages = list.map((p: any) => ({
      id: p.id,
      name: p.name,
      packageCode: p.packageCode,
      basePrice: Number(p.basePrice) || 0,
      description: p.notes || null,
    }));
  } catch {
    packages = [];
  }

  return (
    <div className="container max-w-7xl py-8 px-4 sm:px-6">
      <QuotationCreateForm
        lead={{
          id: lead.id,
          leadCode: lead.leadCode,
          tenantId: lead.tenantId || ctx.tenantId,
          branchId: lead.branchId || ctx.branchId || '',
          customerId: lead.customerId || lead.customer?.id || '',
          customerName: lead.customer ? `${lead.customer.firstName} ${lead.customer.lastName || ''}`.trim() : ((lead as any).customerName || 'N/A'),
          customerPhone: lead.customer?.phone || (lead as any).customerPhone || 'N/A',
          customerEmail: lead.customer?.email || (lead as any).customerEmail || 'N/A',
          status: lead.status,
          budgetRange: (lead as any).budgetRange || null,
        }}
        packages={packages}
      />
    </div>
  );
}
