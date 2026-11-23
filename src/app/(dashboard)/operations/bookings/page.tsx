import * as React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getActiveContext } from '@/lib/context';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  User,
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateBookingTrigger } from '@/features/operations/components/CreateBookingTrigger';

export const dynamic = 'force-dynamic';

export default async function BookingsRegistryPage() {
  const context = await getActiveContext();
  if (!context || !context.tenantId) {
    redirect('/login');
  }

  const tenantId = context.tenantId;

  // Strict Branch Scoping:
  // If in Owner "All Branches" mode, query all tenant bookings.
  // Otherwise, filter strictly by active branchId.
  const whereClause: any = {
    tenantId,
    deletedAt: null,
  };

  if (!context.isAllBranches && context.branchId) {
    whereClause.branchId = context.branchId;
  }

  const bookings = await prisma.eventBooking.findMany({
    where: whereClause,
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          customerCode: true,
        },
      },
      postProductionJob: {
        select: {
          id: true,
          status: true,
        },
      },
      assignments: {
        select: {
          id: true,
          role: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
    take: 100,
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Link href="/operations" className="hover:underline">Operations</Link>
            <span>/</span>
            <span>Bookings</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Event Bookings Registry
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Confirmed client shoots, multi-day functions, and operational delivery vouchers
            {context.isAllBranches ? ' (Consolidated across all branches)' : ` for ${context.activeBranch?.name || 'Active Branch'}`}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateBookingTrigger buttonText="+ Create Booking" />
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed in studio pipeline</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Upcoming This Month</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b) => new Date(b.startDate) >= new Date()).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Shoots scheduled ahead</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Post-Production Active</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b) => b.postProductionJob).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Jobs tracked in editing Kanban</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table / List */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold">All Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">No event bookings yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first manual event booking for a walk-in client or convert a winning lead to see it listed here.
              </p>
              <div className="pt-2">
                <CreateBookingTrigger buttonText="Create First Booking" />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Booking Number</th>
                    {context.isAllBranches && <th className="py-3 px-4">Branch</th>}
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {bookings.map((booking) => {
                    const clientName = [booking.customer?.firstName, booking.customer?.lastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim() || 'Client';

                    const startDateFormatted = format(new Date(booking.startDate), 'dd MMM yyyy');
                    const endDateFormatted = format(new Date(booking.endDate), 'dd MMM yyyy');
                    const isSameDay = startDateFormatted === endDateFormatted;

                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {booking.bookingNumber}
                        </td>
                        {context.isAllBranches && (
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                              {booking.branch?.name || 'Main Branch'}
                            </Badge>
                          </td>
                        )}
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {booking.title}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{clientName}</div>
                          {booking.customer?.phone && (
                            <div className="text-[11px] text-slate-500">{booking.customer.phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div>{startDateFormatted}</div>
                          {!isSameDay && (
                            <div className="text-[11px] text-slate-400">to {endDateFormatted}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {booking.location ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{booking.location}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unspecified</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 capitalize border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                          >
                            {booking.journeyStatus.toLowerCase().replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/operations/bookings/${booking.id}`}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                            >
                              Voucher <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
