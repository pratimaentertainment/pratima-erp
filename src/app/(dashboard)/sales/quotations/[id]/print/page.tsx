import * as React from 'react';
import { getQuotationByIdAction } from '@/actions/quotation.actions';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WhatsAppShareButton } from '@/features/quotations/components/WhatsAppShareButton';
import { PrintTriggerButton } from '@/features/quotations/components/PrintTriggerButton';
import { PremiumQuotationDocument } from '@/features/quotations/components/PremiumQuotationDocument';

export const dynamic = 'force-dynamic';

export default async function QuotationPrintPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const res = await getQuotationByIdAction({ id: params.id });
  
  if (!res.success || !res.data) {
    notFound();
  }

  const data = res.data;

  return (
    <div className="-m-6 bg-slate-100 min-h-full text-slate-900 print:m-0 print:p-0 print:bg-white p-4 md:p-8">
      {/* Interactive Toolbar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <Link href={`/sales/quotations/${data.id}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Quotation</span>
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <WhatsAppShareButton quotation={data} />
          <PrintTriggerButton />
        </div>
      </div>

      {/* Main Premium Quotation Document */}
      <PremiumQuotationDocument quotation={data} isPublic={false} />
    </div>
  );
}
