import * as React from 'react';
import { QuotationListView } from '@/features/quotations/components/QuotationListView';
import type { QuotationDto } from '@/features/quotations/types';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { QuotationRepository } from '@/repositories/quotation.repository';
import { serializePrisma } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

async function getQuotationsAction(page: number, limit: number, filters: any): Promise<{ data: QuotationDto[]; total: number }> {
  try {
    const ctx = await buildContextAndAuthorize();
    const take = limit > 0 ? limit : 10;
    const skip = Math.max(0, (page > 0 ? page - 1 : page) * take);

    const [rawQuotes, total] = await Promise.all([
      QuotationRepository.findAll(ctx.tenantId, ctx.branchId || null, { ...filters, skip, take }),
      QuotationRepository.count(ctx.tenantId, ctx.branchId || null, filters),
    ]);

    const data: QuotationDto[] = rawQuotes.map((q: any) => {
      const rev = q.quotationRevisions?.[0];
      const client = q.lead?.customer;
      const customerName = [client?.firstName, client?.lastName].filter(Boolean).join(' ').trim() || client?.name || q.lead?.customerName || 'Valued Client';
      const quoteNumber = rev?.revisionNumber ? `${q.lead?.leadCode || 'QT'}-R${rev.revisionNumber}` : (q.lead?.leadCode || `QT-${q.id.slice(0, 8)}`);
      const title = q.lead?.inquiry?.eventType ? `${q.lead.inquiry.eventType} Photography` : 'Commercial Quotation';

      return serializePrisma({
        id: q.id,
        quoteNumber,
        customerId: q.lead?.customerId || client?.id || '',
        customerName,
        title,
        status: (q.status as any) || 'DRAFT',
        issueDate: (q.createdAt ? new Date(q.createdAt) : new Date()).toISOString(),
        expiryDate: (q.validUntil ? new Date(q.validUntil) : new Date()).toISOString(),
        subtotal: Number(rev?.subtotal || q.totalAmount || 0),
        totalDiscount: Number(rev?.discountAmount || 0),
        totalTax: Number(rev?.taxAmount || 0),
        grandTotal: Number(rev?.grandTotal || q.totalAmount || 0),
        createdAt: (q.createdAt ? new Date(q.createdAt) : new Date()).toISOString(),
        updatedAt: (q.updatedAt ? new Date(q.updatedAt) : new Date()).toISOString(),
        createdBy: rev?.createdById || '',
        version: rev?.revisionNumber || 1,
        items: [],
      });
    });

    return { data, total };
  } catch {
    return { data: [], total: 0 };
  }
}

export default async function QuotationListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = (await searchParams) || {};
  const page = Number(resolvedParams.page) || 0;
  const limit = Number(resolvedParams.limit) || 10;
  
  // Extract custom filters from search params
  const filters: Record<string, string> = {};
  for (const key in resolvedParams) {
    if (key.startsWith('filter_')) {
      const value = resolvedParams[key];
      if (typeof value === 'string') {
        filters[key.replace('filter_', '')] = value;
      }
    }
  }

  const { data, total } = await getQuotationsAction(page, limit, filters);

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading quotations...</div>}>
      <QuotationListView data={data} totalRows={total} />
    </React.Suspense>
  );
}
