import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { CalendarService } from '@/services/calendar/calendar.service';
import { EnterpriseCalendar } from '@/features/operations/components/calendar';
import { serializePrisma } from '@/lib/serialize';

export const metadata: Metadata = {
  title: 'Operations Calendar | Pratima ERP',
  description: 'Multi-tenant schedule, shoot management, and staff dispatch calendar.',
};

export const dynamic = 'force-dynamic';

export default async function OperationsCalendarPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  // Build authorized multi-tenant context with active branch resolution
  const ctx = await buildContextAndAuthorize('Operations:View');

  // Compute current month window with full week padding for clean calendar rendering
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const calendarWindowStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarWindowEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rawEvents = await CalendarService.getCalendarEvents(ctx, {
    startDate: calendarWindowStart,
    endDate: calendarWindowEnd,
  });

  const initialEvents = serializePrisma(rawEvents);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-[1600px] mx-auto">
      <EnterpriseCalendar
        initialEvents={initialEvents}
        initialDate={now.toISOString()}
      />
    </div>
  );
}
