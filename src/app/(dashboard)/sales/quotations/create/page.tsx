import * as React from 'react';
import { redirect } from 'next/navigation';
import { QuotationForm } from '@/features/quotations/components/QuotationForm';

export default async function QuotationCreatePage(props: {
  searchParams?: Promise<{ leadId?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (searchParams?.leadId) {
    redirect(`/quotations/create/${searchParams.leadId}`);
  }

  return (
    <div className="container max-w-7xl py-2 sm:py-4 px-1 sm:px-2">
      <QuotationForm />
    </div>
  );
}
