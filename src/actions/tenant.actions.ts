'use server';

import { auth } from '@/auth';
import { TenantService } from '@/services/tenant.service';
import { tenantUpdateSchema } from '@/lib/validations/tenant.schema';
import { revalidatePath } from 'next/cache';

export async function getTenantProfileAction() {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId) return { success: false, error: 'Unauthorized' };

  try {
    const tenant = await TenantService.getTenantProfile((session.user as any).tenantId);
    return { success: true, data: tenant };
  } catch (error: any) {
    return { success: false, error: error.message || 'Something went wrong' };
  }
}

export async function updateTenantProfileAction(formData: any) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  if (!(session.user as any)?.tenantId || !session.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const validatedData = tenantUpdateSchema.parse(formData);
    const updated = await TenantService.updateTenantProfile((session.user as any).tenantId, session.user.id, validatedData);
    revalidatePath('/dashboard/settings/tenant');
    revalidatePath('/settings/tenant');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Validation failed' };
  }
}
