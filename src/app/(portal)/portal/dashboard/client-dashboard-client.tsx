'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  CreditCard,
  ArrowRight,
  ArrowDownToLine,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Image as ImageIcon,
  BookOpen,
  HelpCircle,
  Building,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { JourneyTracker } from '@/components/portal/journey-tracker';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ClientVideoDeliverablesView, ClientVideoTask } from '@/components/features/portal/video-review/client-video-deliverables-view';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

export interface ClientDashboardData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  tenant: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    logoUrl: string | null;
    slug: string | null;
    website: string | null;
    bio: string | null;
  };
  activeBooking: {
    id: string;
    bookingNumber: string;
    title: string;
    startDate: string;
    endDate: string;
    status: string;
    journeyStatus: string;
    location: string | null;
    notes: string | null;
    subEvents: Array<{
      id: string;
      name: string;
      eventDate: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
    }>;
    activeSelectionId?: string | null;
    activeSelectionTitle?: string | null;
    activeAlbumId?: string | null;
    activeAlbumTitle?: string | null;
  } | null;
  financials: {
    totalAmount: number;
    paidAmount: number;
    pendingDue: number;
    currency: string;
    invoiceNumber?: string | null;
    invoiceStatus?: string | null;
    payments: Array<{
      id: string;
      receiptNumber: string;
      amount: number;
      date: string;
      method: string;
    }>;
  };
  allBookings: Array<{
    id: string;
    bookingNumber: string;
    title: string;
    startDate: string;
    journeyStatus: string;
  }>;
  selections: Array<{
    id: string;
    title: string;
    status: string;
    galleryMode: 'SELECTION' | 'DELIVERY' | string;
    allowDownloads?: boolean;
    expiresAt: string | null;
    itemCount: number;
    eventBookingTitle?: string | null;
    eventBookingNumber?: string | null;
  }>;
  albums: Array<{
    id: string;
    title: string;
    status: string;
    totalSheets: number;
  }>;
  videoTasks?: ClientVideoTask[];
  accessCode?: string;
}

interface ClientDashboardClientProps {
  data: ClientDashboardData;
}

export function ClientDashboardClient({ data }: ClientDashboardClientProps) {
  const { customer, tenant, activeBooking, financials, allBookings, selections, albums, videoTasks = [] } = data;
  const [selectedBookingId, setSelectedBookingId] = useState(activeBooking?.id || '');

  // Clean WhatsApp number
  const cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '');
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi ${tenant.name}, I am contacting you regarding my booking ${activeBooking?.bookingNumber || ''} (${customer.firstName} ${customer.lastName}).`
      )}`
    : null;

  // Financial progress percentage
  const paidPercent =
    financials.totalAmount > 0
      ? Math.min(100, Math.round((financials.paidAmount / financials.totalAmount) * 100))
      : 100;

  // Calculate days remaining to event
  let daysToEvent: number | null = null;
  if (activeBooking?.startDate) {
    const eventTime = new Date(activeBooking.startDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.ceil((eventTime - nowTime) / (1000 * 60 * 60 * 24));
    daysToEvent = diffDays;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome, {customer.firstName} {customer.lastName}
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 rounded-full">
              Client Portal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking your photography & cinema journey with{' '}
            <span className="font-semibold text-foreground">{tenant.name}</span>
          </p>
        </div>

        {/* Multi-booking switcher if customer has multiple events */}
        {allBookings.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Active Event:</span>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="text-xs font-medium rounded-lg border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {allBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.bookingNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Main Section: Dynamic Journey Tracker */}
      {activeBooking ? (
        <section aria-label="Event Progress">
          <JourneyTracker
            status={activeBooking.journeyStatus}
            bookingTitle={activeBooking.title}
            eventDate={activeBooking.startDate ? formatDate(activeBooking.startDate, 'MMMM dd, yyyy') : null}
            location={activeBooking.location}
          />
        </section>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No Active Bookings Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your studio coordinator is preparing your project. Once confirmed, your complete event journey
            and milestones will appear here.
          </p>
        </div>
      )}

      {/* 3. Action Grid (3 Cards: Action Center, Financials, Studio Contact) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Dashboard Overview">
        {/* Card 1: Action Center */}
        <Card className="flex flex-col justify-between border-border/80 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/40" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Action Center
              </span>
              {activeBooking?.journeyStatus === 'SELECTION_PENDING' ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]">
                  Action Needed
                </Badge>
              ) : activeBooking?.journeyStatus === 'DELIVERED' ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px]">
                  On Track
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-1">
              {activeBooking?.journeyStatus === 'SELECTION_PENDING'
                ? 'Select Your Photos'
                : activeBooking?.journeyStatus === 'EDITING_IN_PROGRESS'
                ? 'Editing in Production'
                : activeBooking?.journeyStatus === 'ALBUM_PRINTING'
                ? 'Album Printing & Binding'
                : activeBooking?.journeyStatus === 'DELIVERED'
                ? 'Media Delivered'
                : activeBooking?.journeyStatus === 'SHOOT_COMPLETED'
                ? 'Shoot Wrap & Ingestion'
                : 'Shoot Countdown'}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {activeBooking?.journeyStatus === 'SELECTION_PENDING'
                ? 'Your raw photo gallery is live! Please curate and finalize your favorite photos for print.'
                : activeBooking?.journeyStatus === 'EDITING_IN_PROGRESS'
                ? 'Our master editors are color-grading and retouching your chosen photos.'
                : activeBooking?.journeyStatus === 'ALBUM_PRINTING'
                ? 'Your handcrafted album has been sent to our master print lab.'
                : activeBooking?.journeyStatus === 'DELIVERED'
                ? 'All master photos, highlight reels, and albums are ready for lifetime access.'
                : activeBooking?.journeyStatus === 'SHOOT_COMPLETED'
                ? 'Our digital technician has backed up your media. Curation gallery will be available shortly.'
                : daysToEvent !== null && daysToEvent > 0
                ? `${daysToEvent} days until your shoot begins! Our team is preparing equipment and shot lists.`
                : 'Your booking dates are secured. We are ready to capture your special moments.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pb-3">
            {activeBooking?.journeyStatus === 'SELECTION_PENDING' && activeBooking.activeSelectionId && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs space-y-1">
                <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {activeBooking.activeSelectionTitle || 'Photo Selection Board'}
                </div>
                <p className="text-amber-800/80 dark:text-amber-300/80">
                  Select your favorites so we can commence album layout and color grading.
                </p>
              </div>
            )}

            {activeBooking?.journeyStatus === 'BOOKED' && daysToEvent !== null && daysToEvent >= 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-center">
                <div className="text-3xl font-extrabold text-primary">{daysToEvent}</div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Days Remaining
                </div>
              </div>
            )}

            {activeBooking?.journeyStatus === 'DELIVERED' && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All delivered assets can be viewed online or downloaded in high definition.</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2">
            {activeBooking?.journeyStatus === 'SELECTION_PENDING' && activeBooking.activeSelectionId ? (
              <Link
                href={`/gallery/selection/${activeBooking.activeSelectionId}`}
                className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2 font-semibold shadow-xs')}
              >
                <ImageIcon className="w-4 h-4" />
                Select Your Photos
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>
            ) : selections.length > 0 ? (
              <Link
                href={`/gallery/selection/${selections[0].id}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2 text-xs font-semibold')}
              >
                <ImageIcon className="w-4 h-4" />
                View Selection Gallery
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>
            ) : (
              <a
                href="#studio-contact"
                className={cn(buttonVariants({ variant: 'secondary' }), 'w-full gap-2 text-xs font-semibold')}
              >
                <MessageSquare className="w-4 h-4" />
                Message Studio
              </a>
            )}
          </CardFooter>
        </Card>

        {/* Card 2: Financials */}
        <Card className="flex flex-col justify-between border-border/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-500/40" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Summary
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-semibold',
                  financials.pendingDue === 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {financials.pendingDue === 0 ? 'Fully Paid' : 'Payment Pending'}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-foreground mt-1">
              {formatMoney(financials.totalAmount, financials.currency)}
            </CardTitle>
            <CardDescription className="text-xs">
              {financials.invoiceNumber ? `Invoice #${financials.invoiceNumber}` : 'Total Event Investment'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-3">
            {/* Payment Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Paid: {formatMoney(financials.paidAmount, financials.currency)}</span>
                <span className="font-semibold text-foreground">{paidPercent}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            {/* Breakdown row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60">
                <div className="text-[11px] text-muted-foreground">Amount Paid</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(financials.paidAmount, financials.currency)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60">
                <div className="text-[11px] text-muted-foreground">Pending Balance</div>
                <div
                  className={cn(
                    'text-sm font-bold',
                    financials.pendingDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                  )}
                >
                  {formatMoney(financials.pendingDue, financials.currency)}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <div className="w-full text-center text-xs text-muted-foreground border-t border-border/60 pt-2.5 flex items-center justify-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {financials.pendingDue > 0
                  ? 'Contact studio for UPI / Bank Transfer'
                  : 'All scheduled installments cleared'}
              </span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 3: Studio Contact */}
        <Card id="studio-contact" className="flex flex-col justify-between border-border/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-500/40" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Studio Concierge
              </span>
              <Badge variant="outline" className="text-[11px]">
                Support
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-1 line-clamp-1">
              {tenant.name}
            </CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {tenant.bio || 'Your dedicated photography and creative production crew.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pb-3 text-xs">
            {tenant.phone && (
              <a
                href={`tel:${tenant.phone}`}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">{tenant.phone}</span>
              </a>
            )}

            {tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground"
              >
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{tenant.email}</span>
              </a>
            )}

            {(tenant.city || tenant.address) && (
              <div className="flex items-center gap-2.5 p-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="line-clamp-1">
                  {[tenant.address, tenant.city, tenant.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2 flex flex-col gap-2">
            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            ) : tenant.phone ? (
              <a
                href={`tel:${tenant.phone}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2 font-semibold')}
              >
                <Phone className="w-4 h-4" />
                Call Studio Team
              </a>
            ) : (
              <a
                href={`mailto:${tenant.email}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2 font-semibold')}
              >
                <Mail className="w-4 h-4" />
                Email Studio
              </a>
            )}
          </CardFooter>
        </Card>
      </section>

      {/* 4. Photo Selection & Deliverables */}
      <section className="space-y-4" aria-label="Photo Selection & Deliverables">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Photo Selection & Deliverables
              </h3>
              <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                {selections.length} {selections.length === 1 ? 'Gallery' : 'Galleries'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access your curated event galleries, proof favorite shots, or download high-resolution master copies.
            </p>
          </div>
        </div>

        {selections.length === 0 ? (
          <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-foreground">No Galleries Published Yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your studio production crew is currently curating and uploading your event photos.
                As soon as a selection board or soft copy delivery gallery is published, you can access it here.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {selections.map((sel) => {
              const isDelivery = sel.galleryMode === 'DELIVERY';
              return (
                <Card
                  key={sel.id}
                  className="flex flex-col justify-between border-border/80 hover:border-primary/50 transition-all duration-200 shadow-xs hover:shadow-md bg-card/80 backdrop-blur-xs relative overflow-hidden group"
                >
                  {/* Top accent bar: emerald for DELIVERY vault, indigo/primary for SELECTION proofing */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 right-0 h-1 transition-all',
                      isDelivery
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-primary to-indigo-400'
                    )}
                  />

                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center justify-between gap-2">
                      {isDelivery ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5">
                          <Download className="w-3 h-3" />
                          Soft Copy Vault
                        </Badge>
                      ) : (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5">
                          <Sparkles className="w-3 h-3" />
                          Photo Selection
                        </Badge>
                      )}

                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {sel.status.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {sel.title}
                    </CardTitle>

                    {(sel.eventBookingTitle || sel.eventBookingNumber) && (
                      <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                        Linked to {sel.eventBookingTitle || sel.eventBookingNumber}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Total Photos
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {sel.itemCount} Images
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Access Mode
                        </span>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                          {isDelivery ? (
                            <>
                              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Direct High-Res ZIP</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Shortlist Proofing</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {sel.expiresAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Available until {formatDate(sel.expiresAt, 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Link
                      href={`/gallery/selection/${sel.id}`}
                      className={cn(
                        buttonVariants({
                          variant: 'default',
                          size: 'sm',
                        }),
                        'w-full font-semibold gap-2 shadow-xs group-hover:shadow-sm transition-all',
                        isDelivery
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      )}
                    >
                      {isDelivery ? (
                        <>
                          <Download className="w-4 h-4" />
                          Download Soft Copies
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Open Selection Gallery
                        </>
                      )}
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Digital Albums Sub-Section */}
        {albums.length > 0 && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                Digital Album Proofs
              </h4>
              <Badge variant="outline" className="text-xs">
                {albums.length} {albums.length === 1 ? 'Album' : 'Albums'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((alb) => (
                <div
                  key={alb.id}
                  className="p-4 rounded-xl border border-border/80 bg-card/60 shadow-xs flex flex-col justify-between gap-3 group hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        Digital Album
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {alb.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{alb.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {alb.totalSheets ? `${alb.totalSheets} designed sheets` : 'In proofing'}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground py-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Proof layout synchronized</span>
                  </div>

                  <Link
                    href={data.accessCode ? `/portal/${data.accessCode}/album/${alb.id}` : '#'}
                    className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2 text-xs font-semibold mt-1 shadow-2xs')}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open e-Album Flipbook</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. Video Deliverables & Creative Review */}
      {videoTasks.length > 0 && (
        <section aria-label="Cinematography & Video Reviews">
          <ClientVideoDeliverablesView
            videoTasks={videoTasks}
            studioName={tenant.name}
          />
        </section>
      )}

      {/* 6. Sub-Events Schedule (If available) */}
      {activeBooking?.subEvents && activeBooking.subEvents.length > 0 && (
        <section className="space-y-4" aria-label="Event Itinerary">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Event Schedule</h3>
              <p className="text-xs text-muted-foreground">
                Shooting itinerary and coverage timeline for this booking.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {activeBooking.subEvents.length} Functions
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBooking.subEvents.map((sub, idx) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-border/80 bg-card/60 shadow-xs space-y-2 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground line-clamp-1">
                    {sub.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
                    #{idx + 1}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{formatDate(sub.eventDate, 'EEEE, MMMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {sub.startTime} {sub.endTime ? `- ${sub.endTime}` : ''}
                    </span>
                  </div>
                  {sub.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="line-clamp-1">{sub.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
