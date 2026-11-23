import * as React from 'react';
import { notFound } from 'next/navigation';
import { BookingService } from '@/services/booking.service';
import { BookingVoucherDocument } from '@/features/bookings/components/BookingVoucherDocument';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const booking = await BookingService.getBookingVoucherData(params.id);

  if (!booking) {
    return { title: 'Voucher Not Found | Pratima Studio' };
  }

  const studioName = booking.tenant?.settings?.studioName || booking.tenant?.name || 'Pratima Studio';

  return {
    title: `Booking Voucher ${booking.bookingNumber} | ${studioName}`,
    description: `Official booking voucher confirmation from ${studioName}.`,
  };
}

export default async function PublicVoucherPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const booking = await BookingService.getBookingVoucherData(params.id);

  if (!booking) {
    notFound();
  }

  const studioName =
    booking.tenant?.settings?.studioName || booking.tenant?.name || 'Pratima Studio';
  const portalUrl = booking.tenant?.slug
    ? `/${booking.tenant.slug}/login`
    : '/portal/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      {/* Public Top Navbar (Hidden on print) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
              {studioName.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight">
                {studioName}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Booking Confirmation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href={portalUrl}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <span>Access Client Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Voucher Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BookingVoucherDocument booking={booking} isPublic={true} />
      </main>
    </div>
  );
}
