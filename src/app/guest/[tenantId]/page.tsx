import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GuestLeadForm } from '@/components/guest/guest-lead-form';
import { EventBookingStatus } from '@prisma/client';
import { Sparkles, Camera, ShieldCheck, HeartHandshake } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

async function resolveTenant(param: string) {
  const isUuid = isValidUuid(param);

  return prisma.tenant.findFirst({
    where: {
      OR: [
        ...(isUuid ? [{ id: param }] : []),
        { slug: param },
        { universalStudioQrCode: param },
      ],
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      tradeName: true,
      companyLegalName: true,
      logoUrl: true,
      bio: true,
      phone: true,
      contactPhone: true,
      isAIGuestPortalEnabled: true,
      universalStudioQrCode: true,
    },
  });
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const tenant = await resolveTenant(params.tenantId);

  if (!tenant) {
    return {
      title: 'Studio Guest Portal | Pratima ERP',
    };
  }

  const studioName = tenant.tradeName || tenant.companyLegalName || tenant.name;

  return {
    title: `Find Your Photos | ${studioName}`,
    description: `Universal AI Guest Portal by ${studioName}. Take a quick selfie to receive your event photos directly on WhatsApp.`,
  };
}

export default async function GuestPortalPage(props: PageProps) {
  const params = await props.params;
  const tenant = await resolveTenant(params.tenantId);

  if (!tenant) {
    notFound();
  }

  const studioName =
    tenant.tradeName || tenant.companyLegalName || tenant.name || 'Pratima Photography Studio';

  // Fetch active/recent event bookings for this studio to populate the event selector
  const activeBookings = await prisma.eventBooking.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      status: { not: EventBookingStatus.CANCELLED },
    },
    select: {
      id: true,
      title: true,
      bookingNumber: true,
      startDate: true,
      location: true,
    },
    orderBy: {
      startDate: 'desc',
    },
    take: 25,
  });

  const activeEvents = activeBookings.map((b) => ({
    id: b.id,
    title: b.title || 'Studio Production',
    bookingNumber: b.bookingNumber,
    startDate: b.startDate,
    location: b.location,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-background flex flex-col items-center justify-between p-4 sm:p-6 md:p-8">
      {/* Background Decorative Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content Container (Max width 480px for mobile-first app experience) */}
      <div className="w-full max-w-md mx-auto space-y-6 relative z-10 my-auto py-4">
        {/* Studio Brand Header */}
        <div className="text-center space-y-3">
          {tenant.logoUrl ? (
            <div className="relative mx-auto w-16 h-16 rounded-2xl overflow-hidden border shadow-sm bg-card p-1">
              <Image
                src={tenant.logoUrl}
                alt={studioName}
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          ) : (
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-md">
              {studioName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal AI Guest Portal</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {studioName}
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Scan, take a quick selfie, and get your personalized event photos delivered to your WhatsApp.
            </p>
          </div>
        </div>

        {/* Lead Capture Form */}
        <GuestLeadForm
          tenantId={tenant.id}
          studioName={studioName}
          studioLogoUrl={tenant.logoUrl}
          activeEvents={activeEvents}
        />

        {/* Trust & Privacy Assurance */}
        <div className="pt-2 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Private
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-primary" /> Instant AI Match
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> Free to Guests
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/80">
            Powered by Pratima ERP &bull; The Enterprise Studio Cloud
          </p>
        </div>
      </div>
    </div>
  );
}
