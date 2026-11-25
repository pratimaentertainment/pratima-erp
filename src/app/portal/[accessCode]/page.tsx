import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import Link from 'next/link';
import { Camera, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ClientDashboardClient, ClientDashboardData } from '@/app/(portal)/portal/dashboard/client-dashboard-client';

export const metadata: Metadata = {
  title: 'Client Portal Dashboard | FRAMIQ',
  description: 'Track your event journey, curate photo selections, and manage your invoices.',
};

interface PageProps {
  params: Promise<{ accessCode: string }>;
}

export default async function ClientPortalAccessCodePage({ params }: PageProps) {
  const { accessCode } = await params;

  if (!accessCode) {
    notFound();
  }

  // 1. Fetch customer by portal access code, customer code, or ID (safe UUID check to prevent Postgres casting errors)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessCode);

  const orConditions: Array<{ portalAccessCode?: string; customerCode?: string; id?: string }> = [
    { portalAccessCode: accessCode },
    { customerCode: accessCode },
  ];

  if (isUuid) {
    orConditions.push({ id: accessCode });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: orConditions,
      deletedAt: null,
    },
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

  if (!customer) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Link Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The portal magic link you used is invalid or has expired.
          </p>
          <p className="text-xs text-muted-foreground">
            Please verify your invitation link or log in directly using your registered mobile number and PIN on the studio storefront.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2')}
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Storefront Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Set HttpOnly JWT Client Session Cookie for seamless navigation
  try {
    const rawSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!rawSecret) {
      throw new Error('FATAL SECURITY ERROR: AUTH_SECRET or NEXTAUTH_SECRET is required to sign portal sessions.');
    }
    const secret = new TextEncoder().encode(rawSecret);
    const token = await new SignJWT({
      customerId: customer.id,
      tenantId: customer.tenantId,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      role: 'CLIENT',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('pratima_client_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch (err) {
    console.warn('[PORTAL_COOKIE_SET_WARN]', err);
  }

  // 3. Resolve Active Event Booking
  const activeBookingRaw = customer.eventBookings[0] || null;

  // 4. Compute Financial Totals
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

  // 5. Query All Photo Selection Boards (linked via Customer or EventBookings)
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

  // 5b. Query Video Workflow Tasks for Client Review & Approval
  const videoTasksRaw = await prisma.workflowTask.findMany({
    where: {
      deletedAt: null,
      previewUrl: { not: null },
      eventBooking: { customerId: customer.id },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      taskType: true,
      type: true,
      status: true,
      previewUrl: true,
      deliveryUrl: true,
      clientFeedback: true,
      revisionsCount: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
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

  // 6. Serialize data cleanly for Client Component consumption
  const dashboardData: ClientDashboardData = {
    accessCode,
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
    videoTasks: videoTasksRaw.map((t) => ({
      id: t.id,
      taskType: t.taskType,
      type: t.type,
      status: t.status,
      previewUrl: t.previewUrl,
      deliveryUrl: t.deliveryUrl,
      clientFeedback: t.clientFeedback,
      revisionsCount: t.revisionsCount,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    })),
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/portal/${accessCode}`} className="flex items-center gap-2.5 group">
              {customer.tenant.logoUrl ? (
                <img
                  src={customer.tenant.logoUrl}
                  alt={customer.tenant.name}
                  className="w-8 h-8 rounded-lg object-cover border border-border/80"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground line-clamp-1">
                  {customer.tenant.name}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Client Suite
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground hidden sm:inline">
              Welcome, <strong className="text-foreground">{customer.firstName} {customer.lastName}</strong>
            </span>
            <Badge variant="outline" className="text-[11px] gap-1 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Access
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Unified Dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientDashboardClient data={dashboardData} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-background/50 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{customer.tenant.name} • Official Client Portal</span>
          <span>Secured by Pratima Enterprise Platform</span>
        </div>
      </footer>
    </div>
  );
}
