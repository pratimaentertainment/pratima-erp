'use server';

import { revalidatePath } from 'next/cache';
import { MasterService } from '@/services/master.service';
import { MasterEntityName } from '@/lib/master-config';

export async function createMasterEntity(entity: MasterEntityName, data: any) {
  try {
    const record = await MasterService.create(entity, data);
    revalidatePath(`/dashboard/masters/${entity}`);
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMasterEntity(entity: MasterEntityName, id: string, data: any) {
  try {
    const record = await MasterService.update(entity, id, data);
    revalidatePath(`/dashboard/masters/${entity}`);
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMasterEntity(entity: MasterEntityName, id: string) {
  try {
    await MasterService.softDelete(entity, id);
    revalidatePath(`/dashboard/masters/${entity}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
