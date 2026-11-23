import * as React from 'react';
import { notFound } from 'next/navigation';
import { QuotationForm } from '@/features/quotations/components/QuotationForm';
import { getQuotationByIdAction } from '@/actions/quotation.actions';
import { PackageService } from '@/services/package.service';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QuotationEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const res = await getQuotationByIdAction({ id: params.id });

  if (!res.success || !res.data) {
    notFound();
  }

  const quotation: any = res.data;
  const ctx = await buildContextAndAuthorize();

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

  const latestRev = quotation.revisions?.[0] || (quotation as any).latestRevision;
  const isDraft = latestRev?.status === 'DRAFT' || quotation.status === 'DRAFT';
  const mode = isDraft ? 'edit' : 'revise';
  const currentRevisionNumber = latestRev?.revisionNumber || quotation.version || 1;

  // Map existing quotation and revision items to form initial values
  const initialValues: any = {
    leadId: quotation.leadId || quotation.lead?.id,
    tenantId: quotation.tenantId || quotation.lead?.tenantId,
    branchId: quotation.branchId || quotation.lead?.branchId,
    customerId: quotation.customerId || quotation.lead?.customer?.id,
    customerName: quotation.customerName || (quotation.lead?.customer ? `${quotation.lead.customer.firstName} ${quotation.lead.customer.lastName || ''}`.trim() : ''),
    customerPhone: quotation.customerPhone || quotation.lead?.customer?.phone || '',
    customerEmail: quotation.customerEmail || quotation.lead?.customer?.email || null,
    title: quotation.title || `Quotation for ${quotation.customerName || 'Client'}`,
    validUntil: quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : '',
    eventDate: quotation.eventDate ? new Date(quotation.eventDate).toISOString().split('T')[0] : '',
    pricingMode: latestRev?.pricingMode || quotation.pricingMode || 'ITEMIZED',
    lumpSumAmount: latestRev?.lumpSumAmount != null ? Number(latestRev.lumpSumAmount) : (quotation.lumpSumAmount != null ? Number(quotation.lumpSumAmount) : undefined),
    subjects: (quotation.subjects || []).map((s: any) => ({
      id: s.id,
      role: s.role || 'Bride',
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      birthDate: s.birthDate ? new Date(s.birthDate).toISOString().split('T')[0] : '',
      anniversaryDate: s.anniversaryDate ? new Date(s.anniversaryDate).toISOString().split('T')[0] : '',
    })),
    functions: (quotation.functions || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      date: f.date ? new Date(f.date).toISOString().split('T')[0] : '',
      venue: f.venue || '',
    })),
    deliverables: (quotation.deliverables || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      itemType: d.itemType || 'ALBUM',
      quantity: Number(d.quantity) || 1,
      basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
    })),
    items: (latestRev?.items || quotation.items || []).map((item: any) => ({
      id: item.id,
      packageId: item.packageId || null,
      quotationFunctionId: (item.snapshotExtra as any)?.functionReference || item.quotationFunctionId || null,
      itemName: item.itemName || item.package?.name || 'Service Component',
      description: item.description || (item.snapshotExtra as any)?.customDescription || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discountType: (item.itemDiscountType || item.discountType || 'NONE') === 'FIXED_AMOUNT' ? 'FIXED' : (item.itemDiscountType || item.discountType || 'NONE'),
      discountValue: Number(item.itemDiscountValue ?? item.discountValue ?? 0),
    })),
    discountType: (latestRev?.discountType || 'NONE') === 'FIXED_AMOUNT' ? 'FIXED' : (latestRev?.discountType || 'NONE'),
    discountValue: Number(latestRev?.discountValue || 0),
    taxRate: latestRev?.taxAmount && latestRev?.subtotal && Number(latestRev.subtotal) > 0
      ? Math.round((Number(latestRev.taxAmount) / Number(latestRev.subtotal)) * 100)
      : 18,
    advanceRequired: quotation.advanceRequired != null ? Number(quotation.advanceRequired) : undefined,
    notes: quotation.notes || latestRev?.revisionComment || '',
    termsAndConditions: quotation.terms || quotation.termsAndConditions || quotation.acceptanceTerms || '',
    updatedAt: latestRev?.updatedAt || quotation.updatedAt,
  };

  return (
    <div className="container max-w-7xl py-2 sm:py-4 px-1 sm:px-2">
      <QuotationForm
        lead={{
          id: quotation.leadId || quotation.lead?.id,
          leadCode: quotation.lead?.leadCode || '',
          tenantId: quotation.tenantId || quotation.lead?.tenantId,
          branchId: quotation.branchId || quotation.lead?.branchId,
          customerId: quotation.customerId || quotation.lead?.customer?.id,
          customerName: quotation.customerName || (quotation.lead?.customer ? `${quotation.lead.customer.firstName} ${quotation.lead.customer.lastName || ''}`.trim() : ''),
          customerPhone: quotation.customerPhone || quotation.lead?.customer?.phone || '',
          customerEmail: quotation.customerEmail || quotation.lead?.customer?.email || null,
          status: quotation.status,
          // CRITICAL: NEVER pass lead.budgetRange here so it never overrides or falls back to lead's expected amount!
          budgetRange: null,
        }}
        initialValues={initialValues}
        packages={packages}
        quotationId={quotation.id}
        revisionId={isDraft ? latestRev?.id : undefined}
        revisionNumber={currentRevisionNumber}
        mode={mode}
      />
    </div>
  );
}
