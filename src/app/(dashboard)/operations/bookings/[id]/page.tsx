import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getBookingCommandCenterData } from '@/actions/dispatch.actions';
import { BookingCommandCenterClient } from './booking-command-center-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const res = await getBookingCommandCenterData(params.id);

  if (!res.success || !res.data?.booking) {
    return { title: 'Booking Not Found | Pratima ERP' };
  }

  const booking = res.data.booking;
  return {
    title: `Shoot Command Center: ${booking.bookingNumber} | ${booking.title}`,
    description: `Manage SubEvents, Crew Allocation, Gear Dispatch, and Client Vouchers for ${booking.title}.`,
  };
}

export default async function BookingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const params = await props.params;
  const res = await getBookingCommandCenterData(params.id);

  if (!res.success || !res.data?.booking) {
    notFound();
  }

  return <BookingCommandCenterClient initialData={res.data} />;
}
