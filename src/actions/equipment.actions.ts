'use server';

import { revalidatePath } from 'next/cache';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { PERMISSIONS } from '@/constants/permissions.constants';
import { EquipmentService } from '@/services/equipment/equipment.service';
import { checkoutEquipmentSchema } from '@/schemas/equipment-checkout.schema';
import { ActionResponse } from '@/actions/action-response';
import { EquipmentCheckout, Equipment } from '@prisma/client';

export async function checkoutEquipmentAction(
  data: unknown
): Promise<ActionResponse<EquipmentCheckout>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.EQUIPMENT.MANAGE);
    
    const validatedData = checkoutEquipmentSchema.parse(data);
    
    const checkout = await EquipmentService.checkoutEquipment(ctx, validatedData);
    
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations/bookings');
    
    return { success: true, data: checkout };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to checkout equipment' };
  }
}

export async function getShootEquipmentCheckoutsAction(
  targetId: string
): Promise<ActionResponse<EquipmentCheckout[]>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.EQUIPMENT.VIEW);
    const checkouts = await EquipmentService.getShootEquipmentCheckouts(ctx, targetId);
    
    return { success: true, data: checkouts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch equipment checkouts' };
  }
}

export async function returnEquipmentAction(
  id: string,
  targetId?: string
): Promise<ActionResponse<EquipmentCheckout>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.EQUIPMENT.MANAGE);
    
    const checkout = await EquipmentService.returnEquipment(ctx, id);
    
    revalidatePath('/operations/dispatch');
    revalidatePath('/operations/bookings');
    
    return { success: true, data: checkout };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to return equipment' };
  }
}

export async function getAvailableEquipmentAction(): Promise<ActionResponse<Equipment[]>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.EQUIPMENT.VIEW);
    
    const equipment = await EquipmentService.getBranchEquipment(ctx);
    
    return { success: true, data: equipment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch available equipment' };
  }
}
