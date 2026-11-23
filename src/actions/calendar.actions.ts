'use server';

import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { CalendarService } from '@/services/calendar/calendar.service';
import { ActionResponse } from '@/actions/action-response';
import { CalendarEventDto } from '@/services/calendar/calendar.types';

export async function getCalendarEventsAction(
  startDate?: string | Date,
  endDate?: string | Date,
  bookingId?: string
): Promise<ActionResponse<CalendarEventDto[]>> {
  try {
    const ctx = await buildContextAndAuthorize('Operations:View');

    const parsedStart = startDate ? new Date(startDate) : undefined;
    const parsedEnd = endDate ? new Date(endDate) : undefined;

    const events = await CalendarService.getCalendarEvents(ctx, {
      startDate: parsedStart,
      endDate: parsedEnd,
      eventBookingId: bookingId,
    });

    return { success: true, data: events };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calendar events',
    };
  }
}
