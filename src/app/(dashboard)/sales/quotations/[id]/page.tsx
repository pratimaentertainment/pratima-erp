import * as React from 'react';
import { notFound } from 'next/navigation';
import { QuotationDetailView } from '@/features/quotations/components/QuotationDetailView';
import { getQuotationByIdAction } from '@/actions/quotation.actions';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const res = await getQuotationByIdAction({ id: params.id });

  if (!res.success || !res.data) {
    notFound();
  }

  return <QuotationDetailView data={res.data as any} />;
}
