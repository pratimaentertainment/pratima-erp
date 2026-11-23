'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';
import {
  BookingVoucherDocument,
  type BookingVoucherData,
} from '@/features/bookings/components/BookingVoucherDocument';
import { JourneyTracker } from '@/components/portal/journey-tracker';
import {
  Printer,
  Share2,
  ExternalLink,
  Copy,
  ArrowLeft,
  CalendarCheck,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BookingClientProps {
  booking: BookingVoucherData;
}

export function BookingClient({ booking }: BookingClientProps) {
  const router = useRouter();

  const customer = booking.customer;
  const customerName =
    customer.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    'Client';

  const dateStr = React.useMemo(() => {
    const s = formatDate(booking.startDate, 'dd MMM yyyy');
    const e = booking.endDate ? formatDate(booking.endDate, 'dd MMM yyyy') : null;
    return e && e !== s ? `${s} to ${e}` : s;
  }, [booking.startDate, booking.endDate]);

  // Construct URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const voucherUrl = `${baseUrl}/voucher/${booking.id}`;
  const portalUrl = booking.tenant?.slug
    ? `${baseUrl}/${booking.tenant.slug}/login`
    : `${baseUrl}/portal/dashboard`;

  // WhatsApp Pre-filled URL formatting for Indian numbers
  const whatsappUrl = React.useMemo(() => {
    let cleanPhone = (customer.phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    const message = `Hello ${customerName}, your booking for ${dateStr} is confirmed! Here is your voucher: ${voucherUrl} and you can track your journey here: ${portalUrl}`;
    const encoded = encodeURIComponent(message);

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }, [customer.phone, customerName, dateStr, voucherUrl, portalUrl]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(voucherUrl);
      toast.success('Public voucher link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-0">
      {/* Top Operations Header (Hidden on Print) */}
      <div className="bg-white border-b border-slate-200 -mx-6 -mt-6 p-6 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Booking: {booking.bookingNumber}
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs">
                <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                {booking.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 pl-10">
              {booking.title} • Client: <span className="font-semibold text-slate-700">{customerName}</span> ({customer.phone || 'No phone'})
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs h-9 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy Link</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-9 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Download / Print</span>
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-lg shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Share Voucher on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0">
        {/* Journey Tracker Component (Hidden on Print) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:hidden">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Production & Post-Sale Journey Status
          </h3>
          <JourneyTracker
            status={booking.journeyStatus || 'BOOKED'}
            bookingTitle={booking.title}
            eventDate={dateStr}
            location={booking.location}
          />
        </div>

        {/* Printable Booking Voucher Document */}
        <BookingVoucherDocument booking={booking} />
      </div>
    </div>
  );
}
