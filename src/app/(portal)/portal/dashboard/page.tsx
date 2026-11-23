import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ClientDashboardClient, ClientDashboardData } from './client-dashboard-client';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getClientPortalSession } from '@/actions/portal-auth.actions';

export const metadata: Metadata = {
  title: 'Client Portal Dashboard | Pratima ERP',
  description: 'Track your event journey, curate photo selections, and manage your invoices.',
};

export default async function ClientPortalDashboardPage() {
  const session = await auth();
  const clientSession = await getClientPortalSession();

  if (!clientSession?.customerId && (!session || !session.user?.id)) {
    redirect('/login?callbackUrl=/portal/dashboard');
  }

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // 1. Fetch Customer profile linked to clientSession or session user
  const customerWhere: any = clientSession?.customerId
    ? { id: clientSession.customerId, deletedAt: null }
    : {
        OR: [
          { userId },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
        deletedAt: null,
      };

  const customer = await prisma.customer.findFirst({
    where: customerWhere,
    include: {
      tenant: true,
      eventBookings: {
        where: { deletedAt: null },
        orderBy: { startDate: 'desc' },
        include: {
          subEvents: {
            orderBy: { eventDate: 'asc' },
          },
          clientSelections: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { items: true },
              },
            },
          },
          albumProjects: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
          invoice: {
            include: {
              payments: {
                where: { status: 'SUCCESS' },
              },
            },
          },
        },
      },
      clientSelections: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
      },
      albumProjects: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        where: { deletedAt: null },
        include: {
          payments: {
            where: { status: 'SUCCESS' },
          },
        },
      },
    },
  });

  // If no customer record is linked to this login
  if (!customer) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Client Profile Linked</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your login account (<span className="font-semibold text-foreground">{userEmail || userId}</span>)
            is not currently linked to an active client record.
          </p>
          <p className="text-xs text-muted-foreground">
            If you are a studio staff member, please visit the internal ERP dashboard. If you are a client,
            please contact your studio coordinator to link your email address.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2')}
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Studio Staff Dashboard
            </Link>
            <Link
              href="/api/auth/signout?callbackUrl=/login"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Auto-associate userId if not yet linked (e.g. matched by email for staff-created users)
  if (!customer.userId && userId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { userId },
    });
  }

  // 2. Resolve Active Event Booking
  const activeBookingRaw = customer.eventBookings[0] || null;

  // 3. Compute Financial Totals
  let totalAmount = 0;
  let paidAmount = 0;
  let pendingDue = 0;
  let invoiceNumber: string | null = null;
  let invoiceStatus: string | null = null;
  const recentPayments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    date: string;
    method: string;
  }> = [];

  if (activeBookingRaw?.invoice) {
    const inv = activeBookingRaw.invoice;
    totalAmount = Number(inv.grandTotal);
    paidAmount = Number(inv.paidAmount);
    pendingDue = Number(inv.balanceDue);
    invoiceNumber = inv.invoiceNumber;
    invoiceStatus = inv.status;

    if (inv.payments && inv.payments.length > 0) {
      for (const p of inv.payments) {
        recentPayments.push({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: Number(p.amount),
          date: p.paymentDate.toISOString(),
          method: p.paymentMethod,
        });
      }
    }
  } else if (customer.invoices && customer.invoices.length > 0) {
    for (const inv of customer.invoices) {
      totalAmount += Number(inv.grandTotal);
      paidAmount += Number(inv.paidAmount);
      pendingDue += Number(inv.balanceDue);
      if (!invoiceNumber) invoiceNumber = inv.invoiceNumber;
      if (!invoiceStatus) invoiceStatus = inv.status;

      if (inv.payments) {
        for (const p of inv.payments) {
          recentPayments.push({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amount: Number(p.amount),
            date: p.paymentDate.toISOString(),
            method: p.paymentMethod,
          });
        }
      }
    }
  }

  // 4. Query All Photo Selection Boards (linked via Customer or EventBookings)
  const allSelections = await prisma.clientSelection.findMany({
    where: {
      deletedAt: null,
      OR: [
        { customerId: customer.id },
        { eventBooking: { customerId: customer.id } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      eventBooking: {
        select: {
          title: true,
          bookingNumber: true,
        },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  // Resolve Active Selection / Album IDs
  const activeSelection =
    allSelections[0] ||
    activeBookingRaw?.clientSelections?.[0] ||
    customer.clientSelections?.[0] ||
    null;
  const activeAlbum =
    activeBookingRaw?.albumProjects?.[0] || customer.albumProjects?.[0] || null;

  // 5. Serialize data cleanly for Client Component consumption
  const dashboardData: ClientDashboardData = {
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
    },
    tenant: {
      id: customer.tenant.id,
      name: customer.tenant.name,
      email: customer.tenant.email,
      phone: customer.tenant.phone,
      address: customer.tenant.address,
      city: customer.tenant.city,
      state: customer.tenant.state,
      logoUrl: customer.tenant.logoUrl,
      slug: customer.tenant.slug,
      website: customer.tenant.website,
      bio: customer.tenant.bio,
    },
    activeBooking: activeBookingRaw
      ? {
          id: activeBookingRaw.id,
          bookingNumber: activeBookingRaw.bookingNumber,
          title: activeBookingRaw.title,
          startDate: activeBookingRaw.startDate.toISOString(),
          endDate: activeBookingRaw.endDate.toISOString(),
          status: activeBookingRaw.status,
          journeyStatus: activeBookingRaw.journeyStatus,
          location: activeBookingRaw.location,
          notes: activeBookingRaw.notes,
          subEvents: activeBookingRaw.subEvents.map((s) => ({
            id: s.id,
            name: s.name,
            eventDate: s.eventDate.toISOString(),
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.locationVenue,
          })),
          activeSelectionId: activeSelection?.id || null,
          activeSelectionTitle: activeSelection?.title || null,
          activeAlbumId: activeAlbum?.id || null,
          activeAlbumTitle: activeAlbum?.title || null,
        }
      : null,
    financials: {
      totalAmount,
      paidAmount,
      pendingDue,
      currency: customer.tenant.currency || 'INR',
      invoiceNumber,
      invoiceStatus,
      payments: recentPayments,
    },
    allBookings: customer.eventBookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: b.title,
      startDate: b.startDate.toISOString(),
      journeyStatus: b.journeyStatus,
    })),
    selections: allSelections.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      galleryMode: s.galleryMode || 'SELECTION',
      allowDownloads: Boolean(s.allowDownloads),
      expiresAt: s.selectionDeadline ? s.selectionDeadline.toISOString() : null,
      selectionDeadline: s.selectionDeadline ? s.selectionDeadline.toISOString() : null,
      itemCount: s._count.items,
      eventBookingTitle: s.eventBooking?.title || null,
      eventBookingNumber: s.eventBooking?.bookingNumber || null,
    })),
    albums: customer.albumProjects.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      totalSheets: a.totalSheets || 0,
    })),
  };

  return <ClientDashboardClient data={dashboardData} />;
}
