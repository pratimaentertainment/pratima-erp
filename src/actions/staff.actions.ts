'use server';

import { revalidatePath } from 'next/cache';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { ActionResponse } from '@/actions/action-response';
import { prisma } from '@/lib/prisma';

export async function fetchAvailableStaffAction(skill: string): Promise<ActionResponse> {
  try {
    const ctx = await buildContextAndAuthorize('Operations:View'); 
    const freelancers = await prisma.user.findMany({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        isActive: true,
        isBlacklisted: false,
        skills: { has: skill },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rating: true,
        skills: true,
        employmentType: true,
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: freelancers };
  } catch (error: any) {
    console.error('fetchAvailableStaffAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch freelancers.' };
  }
}

export async function assignStaffAction(
  subEventIdOrShootId: string,
  userId: string,
  role: string
): Promise<ActionResponse> {
  try {
    const ctx = await buildContextAndAuthorize('Operations:Manage'); 
    
    const existing = await prisma.staffAssignment.findFirst({
      where: {
        tenantId: ctx.tenantId,
        subEventId: subEventIdOrShootId,
        userId,
      },
    });

    if (existing) {
      await prisma.staffAssignment.update({
        where: { id: existing.id },
        data: { role },
      });
    } else {
      await prisma.staffAssignment.create({
        data: {
          tenantId: ctx.tenantId,
          subEventId: subEventIdOrShootId,
          userId,
          role,
        },
      });
    }

    revalidatePath('/operations/bookings');
    revalidatePath('/operations/bookings/[id]', 'page');

    return { success: true, data: null, message: 'Staff successfully assigned.' };
  } catch (error: any) {
    console.error('assignStaffAction error:', error);
    return { success: false, error: error.message || 'Failed to assign staff.' };
  }
}
