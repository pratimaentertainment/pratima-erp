import * as React from 'react';
import { notFound } from 'next/navigation';
import { getPublicQuotation } from '@/actions/quotation-client.actions';
import { PremiumQuotationDocument } from '@/features/quotations/components/PremiumQuotationDocument';
import { PublicQuoteActionBar } from '@/features/quotations/components/PublicQuoteActionBar';
import { formatDate } from '@/lib/date';
import { CheckCircle2, Phone, Mail, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const res = await getPublicQuotation(params.id);
  
  if (!res.success || !res.data) {
    return {
      title: 'Quotation Not Found | Pratima Studio',
    };
  }

  const quote = res.data;
  const studioName = quote.tenant?.settings?.studioName || quote.tenant?.tradeName || quote.tenant?.name || 'Studio';
  const quoteRef = quote.quoteNumber || quote.quotationNumber || 'Proposal';

  return {
    title: `${quoteRef} - Photography Proposal | ${studioName}`,
    description: `Official photography quotation and booking proposal from ${studioName}.`,
  };
}

export default async function PublicQuotePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const res = await getPublicQuotation(params.id);

  if (!res.success || !res.data) {
    notFound();
  }

  const quotation = res.data;
  const tenant = quotation.tenant;
  const settings = tenant?.settings;

  const branch = (quotation as any).branch;
  const studioName = settings?.studioName || tenant?.tradeName || tenant?.name || 'Studio';
  const studioPhone = branch?.phone || settings?.phone || tenant?.phone || '';
  const studioEmail = branch?.email || settings?.email || tenant?.email || '';
  
  const statusStr = String(quotation.status || '').toUpperCase();
  const isAccepted = statusStr === 'ACCEPTED' || statusStr === 'APPROVED' || statusStr === 'CONVERTED' || statusStr === 'WON';
  const isRejected = statusStr === 'REJECTED' || statusStr === 'REVISION_REQUESTED';
  const isExpired = statusStr === 'EXPIRED';

  return (
    <div className="bg-gray-50 min-h-screen text-slate-900 print:bg-white print:m-0 print:p-0">
      {/* Minimalist Public Top Header (Hidden on Print) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
              {studioName.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight">
                {studioName}
              </span>
              <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Client Proposal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {studioPhone && (
              <a
                href={`tel:${studioPhone.replace(/\s+/g, '')}`}
                className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{studioPhone}</span>
              </a>
            )}
            {studioEmail && (
              <a
                href={`mailto:${studioEmail}`}
                className="hidden md:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{studioEmail}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Document Container: Center of the screen */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Notice Banner (Hidden on Print) */}
        {isAccepted && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-4 text-xs text-emerald-900 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-950">
                  🎉 Booking Confirmed & Dates Reserved!
                </p>
                <p className="text-emerald-800" suppressHydrationWarning>
                  This quotation was accepted on {formatDate(quotation.updatedAt, 'dd MMM yyyy')}. Our production coordinator will reach out with the detailed itinerary.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-emerald-200/80 font-bold rounded-full text-emerald-900 uppercase text-[10px] tracking-wider">
              Confirmed
            </span>
          </div>
        )}

        {isRejected && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between gap-4 text-xs text-rose-900 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-rose-950">
                  Revision Requested
                </p>
                <p className="text-rose-800">
                  Your revision request has been submitted. Our team is currently reviewing your notes and will issue an updated proposal shortly.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-rose-200/80 font-bold rounded-full text-rose-900 uppercase text-[10px] tracking-wider">
              Under Review
            </span>
          </div>
        )}

        {isExpired && (
          <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl flex items-center justify-between gap-4 text-xs text-slate-800 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">
                  Quotation Expired
                </p>
                <p className="text-slate-600">
                  This quotation has expired. Please get in touch with our studio to request a fresh quotation with current pricing.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-slate-200 font-bold rounded-full text-slate-800 uppercase text-[10px] tracking-wider">
              Expired
            </span>
          </div>
        )}

        {/* The Clean, Read-Only Premium Quotation Document */}
        <PremiumQuotationDocument quotation={quotation} isPublic={true} />
      </main>

      {/* Floating / Sticky Public Action Bar */}
      <PublicQuoteActionBar quotation={quotation} />
    </div>
  );
}
