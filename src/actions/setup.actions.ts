'use server';

import { setupSchema, SetupInput } from '@/lib/validations/setup.schema';
import { SetupService } from '@/services/setup.service';
import { headers } from 'next/headers';

export async function bootstrapAction(data: SetupInput) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    // Validate with Zod
    const parsed = setupSchema.parse(data);

    // Bootstrap
    await SetupService.bootstrapSystem(parsed, ipAddress);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Bootstrap failed.' };
  }
}
