'use client';

import * as React from 'react';
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  Globe,
  Camera,
  Users,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Printer,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BookingVoucherData {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  journeyStatus?: string;
  location?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  customer: {
    id: string;
    customerCode?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    portalAccessCode?: string | null;
  };
  tenant?: {
    name?: string;
    tradeName?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    gstNumber?: string | null;
    logoUrl?: string | null;
    slug?: string | null;
    settings?: {
      studioName?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      gstNumber?: string | null;
    } | null;
  } | null;
  quotation?: {
    id?: string;
    quoteNumber?: string;
    quotationNumber?: string;
    grandTotal?: number;
    totalAmount?: number;
    subtotal?: number;
    totalTax?: number;
    advanceRequired?: number;
    items?: Array<{
      itemName: string;
      quantity?: number;
      unitPrice?: number;
      calculatedTotal?: number;
    }>;
  } | null;
  invoice?: {
    id?: string;
    invoiceNumber?: string;
    grandTotal?: number;
    paidAmount?: number;
    balanceDue?: number;
    status?: string;
  } | null;
  assignments?: Array<{
    role: string;
    user?: {
      name?: string | null;
      phone?: string | null;
    } | null;
  }>;
}

export interface BookingVoucherDocumentProps {
  booking: BookingVoucherData;
  className?: string;
  isPublic?: boolean;
}

export function BookingVoucherDocument({
  booking,
  className = '',
  isPublic = false,
}: BookingVoucherDocumentProps) {
  const tenant = booking.tenant;
  const settings = tenant?.settings || {};

  const studioName = settings?.studioName || tenant?.tradeName || tenant?.name || 'Pratima Photography Studio';
  const studioAddress = settings?.address || tenant?.address || 'Prime Studio Hub, Main Boulevard, India';
  const studioPhone = settings?.phone || tenant?.phone || '+91 98765 43210';
  const studioEmail = settings?.email || tenant?.email || 'contact@pratimastudio.com';
  const studioWebsite = settings?.website || tenant?.website || 'www.pratimastudio.com';
  const gstNumber = settings?.gstNumber || tenant?.gstNumber;
  const logoUrl = tenant?.logoUrl;

  const customer = booking.customer;
  const customerName =
    customer.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    'Valued Client';
  const customerPhone = customer.phone || 'N/A';
  const customerEmail = customer.email || 'N/A';
  const customerCode = customer.customerCode || 'CUST-0001';
  const portalAccessCode = customer.portalAccessCode || 'PRT-ACCESS';

  // Financial calculations
  const invoice = booking.invoice;
  const quote = booking.quotation;

  const totalAmount = Number(
    invoice?.grandTotal ?? quote?.grandTotal ?? quote?.totalAmount ?? 0
  );
  const paidAmount = Number(
    invoice?.paidAmount ?? quote?.advanceRequired ?? (totalAmount > 0 ? Math.round(totalAmount * 0.5) : 0)
  );
  const balanceDue = Number(
    invoice?.balanceDue ?? Math.max(0, totalAmount - paidAmount)
  );

  const items = quote?.items && quote.items.length > 0 ? quote.items : null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const portalBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = tenant?.slug 
    ? `${portalBaseUrl}/${tenant.slug}/login`
    : `${portalBaseUrl}/portal/dashboard`;

  return (
    <div className={`w-full max-w-4xl mx-auto bg-white ${className}`}>
      {/* Forced Print Styles for High-Res PDF Output */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-hidden {
              display: none !important;
            }
            .voucher-sheet {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
          }
        `
      }} />

      {/* Main Voucher Container */}
      <div 
        className="voucher-sheet bg-white border border-slate-200 p-8 md:p-12 rounded-2xl shadow-sm relative overflow-hidden space-y-8"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Top Watermark Badge */}
        <div 
          className="bg-emerald-600 text-white py-2 px-6 -mx-8 -mt-8 md:-mx-12 md:-mt-12 mb-8 flex items-center justify-between text-xs font-bold uppercase tracking-widest"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Official Booking Confirmation Voucher</span>
          </div>
          <span className="font-mono text-emerald-100 font-black">
            {booking.bookingNumber}
          </span>
        </div>

        {/* Studio Branding & Voucher Reference Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={studioName} className="h-12 w-auto object-contain mb-2" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-base">
                  {studioName.charAt(0)}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{studioName}</h2>
              </div>
            )}
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{studioAddress}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
              {studioPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {studioPhone}
                </span>
              )}
              {studioEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> {studioEmail}
                </span>
              )}
              {studioWebsite && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" /> {studioWebsite}
                </span>
              )}
              {gstNumber && (
                <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                  <Building2 className="w-3 h-3 text-slate-400" /> GSTIN: {gstNumber}
                </span>
              )}
            </div>
          </div>

          {/* Voucher Metadata Box */}
          <div className="w-full md:w-auto md:text-right flex flex-col md:items-end">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase tracking-wider rounded-full mb-2"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Booking Confirmed
            </span>
            <div className="text-2xl font-black font-mono tracking-tight text-slate-900">
              {booking.bookingNumber}
            </div>
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 w-full md:min-w-[220px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Date Confirmed:</span>
                <span className="font-semibold text-slate-800" suppressHydrationWarning>
                  {formatDate(booking.createdAt, 'dd MMM yyyy')}
                </span>
              </div>
              {quote && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Quote Ref:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {quote.quoteNumber || quote.quotationNumber || 'QT-CONFIRMED'}
                  </span>
                </div>
              )}
              {invoice?.invoiceNumber && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {invoice.invoiceNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client & Production Assignment Scope */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/90 border border-slate-200/90 p-5 rounded-xl"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {/* Client Details */}
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900">
              Booking Issued To
            </p>
            <h3 className="text-base font-bold text-slate-900">{customerName}</h3>
            <p className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
              Client ID: <span className="font-semibold text-slate-800">{customerCode}</span>
            </p>
            {customerPhone && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400" /> {customerPhone}
              </p>
            )}
            {customerEmail && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-slate-400" /> {customerEmail}
              </p>
            )}
          </div>

          {/* Event Dates & Location */}
          <div className="space-y-1 md:border-l md:border-slate-200 md:pl-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900">
              Event & Production Scope
            </p>
            <h4 className="text-base font-bold text-slate-900">{booking.title}</h4>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span 
                className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold rounded-md flex items-center gap-1"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <Calendar className="w-3 h-3 text-indigo-600" />
                <span suppressHydrationWarning>
                  {formatDate(booking.startDate, 'dd MMM yyyy')}
                  {booking.endDate && formatDate(booking.startDate, 'yyyy-MM-dd') !== formatDate(booking.endDate, 'yyyy-MM-dd') && (
                    <> to {formatDate(booking.endDate, 'dd MMM yyyy')}</>
                  )}
                </span>
              </span>
              {booking.location && (
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {booking.location}
                </span>
              )}
            </div>
            {booking.notes && (
              <p className="text-[11px] text-slate-500 pt-1 italic">
                Note: {booking.notes}
              </p>
            )}
          </div>
        </div>

        {/* Assigned Crew List (If any allocated) */}
        {booking.assignments && booking.assignments.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              Allocated Studio Crew & Specialists
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {booking.assignments.map((asg, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    {asg.role}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {asg.user?.name || 'Studio Specialist'}
                  </span>
                  {asg.user?.phone && (
                    <span className="text-[10px] text-slate-500 block">
                      {asg.user.phone}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables / Scope Overview */}
        {items && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div 
              className="bg-slate-900 text-white py-2.5 px-4 font-bold text-xs uppercase tracking-wider flex items-center justify-between"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <span>Agreed Deliverables & Services</span>
              <span>Scope</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-800">{item.itemName}</span>
                  </div>
                  <span className="font-mono text-slate-600">
                    {item.quantity ? `${item.quantity} Qty` : 'Included'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Ledger & Advance Deposit Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Package Investment
            </span>
            <p className="text-lg font-black font-mono text-slate-900">
              {formatMoney(totalAmount, 'INR')}
            </p>
            <span className="text-[10px] text-slate-400">All deliverables included</span>
          </div>

          <div 
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Advance Deposit Paid
            </span>
            <p className="text-lg font-black font-mono text-emerald-900">
              {formatMoney(paidAmount, 'INR')}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">Dates locked & confirmed</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Remaining Balance Due
            </span>
            <p className="text-lg font-black font-mono text-slate-900">
              {formatMoney(balanceDue, 'INR')}
            </p>
            <span className="text-[10px] text-slate-500">Payable on or before final shoot</span>
          </div>
        </div>

        {/* Client Portal Credentials & Journey Tracking Highlight */}
        <div 
          className="bg-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-sm"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-800/80 text-indigo-200 uppercase tracking-wider border border-indigo-700">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Live Client Experience Portal
              </span>
              <h4 className="text-lg font-extrabold text-white tracking-tight">
                Track Your Production Journey Online
              </h4>
              <p className="text-xs text-indigo-200 max-w-lg leading-relaxed">
                Log in to review shoot day timelines, make photo selections, approve cinematic cuts, and monitor album printing milestones in real time.
              </p>
              <p className="text-[11px] text-indigo-300 font-mono pt-1">
                Portal: <span className="underline">{portalUrl}</span>
              </p>
            </div>

            {/* Portal Access Code Display */}
            <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl text-center min-w-[200px] shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold block mb-1">
                Client Access Code
              </span>
              <div className="font-mono text-xl font-black text-amber-300 tracking-wider py-1 select-all">
                {portalAccessCode}
              </div>
              <span className="text-[9px] text-indigo-300 block">
                Use your registered phone or code to log in
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Authorized Signatures */}
        <div className="border-t border-slate-200 pt-6 space-y-6 text-xs text-slate-600">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] leading-relaxed space-y-1">
            <p className="font-bold text-slate-800">Booking Terms & Policies:</p>
            <p>1. The advance deposit secures your date exclusivity and confirms our production crew availability.</p>
            <p>2. High-resolution raw files will be color-graded and curated within 10-14 business days after shoot wrap.</p>
            <p>3. Client selections for albums and deliverables must be completed within 30 days of gallery delivery.</p>
            <p>4. All deliverables remain the intellectual creation of {studioName} with client personal display rights.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div>
              <div className="border-b border-slate-300 pb-1 w-44"></div>
              <p className="font-bold text-slate-900 text-xs mt-1">Authorized Studio Signatory</p>
              <p className="text-[10px] text-slate-500 uppercase">{studioName}</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="border-b border-slate-300 pb-1 w-44"></div>
              <p className="font-bold text-slate-900 text-xs mt-1">Client Acceptance</p>
              <p className="text-[10px] text-slate-500 uppercase">{customerName}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
          <p suppressHydrationWarning>
            Thank you for trusting {studioName}. This is a computer-generated booking voucher generated on {formatDate(new Date(), 'dd MMM yyyy')}.
          </p>
        </div>
      </div>
    </div>
  );
}
