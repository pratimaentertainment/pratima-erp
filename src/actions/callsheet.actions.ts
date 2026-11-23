'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { callSheetSchema } from '@/validations/callsheet.schema';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { ActionResponse } from '@/actions/action-response';
import { z } from 'zod';

export async function saveCallSheetAction(data: z.infer<typeof callSheetSchema>): Promise<ActionResponse> {
  try {
    const ctx = await buildContextAndAuthorize('Operations:Manage'); 
    const parsed = callSheetSchema.parse(data);
    
    const existing = await prisma.callSheet.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { eventBookingId: parsed.shootId },
          { subEventId: parsed.shootId },
        ],
      },
    });

    let callSheet;
    if (existing) {
      callSheet = await prisma.callSheet.update({
        where: { id: existing.id },
        data: {
          specialNotes: parsed.clientInstructions,
        },
      });
    } else {
      const booking = await prisma.eventBooking.findFirst({
        where: { id: parsed.shootId, tenantId: ctx.tenantId },
      });
      if (booking) {
        callSheet = await prisma.callSheet.create({
          data: {
            tenantId: ctx.tenantId,
            eventBookingId: booking.id,
            callTime: booking.startDate,
            reportingVenue: booking.location || 'TBD',
            specialNotes: parsed.clientInstructions,
          },
        });
      } else {
        const subEvent = await prisma.subEvent.findFirst({
          where: { id: parsed.shootId, tenantId: ctx.tenantId },
        });
        if (subEvent) {
          callSheet = await prisma.callSheet.create({
            data: {
              tenantId: ctx.tenantId,
              eventBookingId: subEvent.eventBookingId,
              subEventId: subEvent.id,
              callTime: subEvent.eventDate,
              reportingVenue: subEvent.locationVenue || 'TBD',
              specialNotes: parsed.clientInstructions,
            },
          });
        }
      }
    }
    
    revalidatePath(`/operations/projects`);
    revalidatePath(`/operations/projects/[id]`, 'page');
    
    return { success: true, data: callSheet || null, message: 'Call Sheet saved successfully.' };
  } catch (error: any) {
    console.error('saveCallSheetAction error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors };
    }
    return { success: false, error: error.message || 'Failed to save Call Sheet.' };
  }
}
