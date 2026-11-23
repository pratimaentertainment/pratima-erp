'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { OfferService, CreatePromotionalOfferInput } from '@/services/offer.service';
import { DiscountType } from '@prisma/client';
import { z } from 'zod';

async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

const createOfferSchema = z.object({
  title: z.string().min(2, 'Offer title must be at least 2 characters'),
  description: z.string().optional().nullable(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive('Discount value must be greater than 0'),
  validUntil: z.string().or(z.date()),
  isActive: z.boolean().default(true),
});

export async function createPromotionalOfferAction(data: {
  title: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  validUntil: string | Date;
  isActive?: boolean;
}) {
  try {
    const { tenantId } = await validateSession();
    const validated = createOfferSchema.parse(data);

    const offer = await OfferService.createPromotionalOffer(tenantId, {
      ...validated,
      validUntil: new Date(validated.validUntil),
    });

    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return { success: true, data: serializePrisma(offer) };
  } catch (error: any) {
    console.error('Error creating promotional offer:', error);
    return { success: false, error: error.message || 'Failed to create offer' };
  }
}

export async function getPromotionalOffersAction() {
  try {
    const { tenantId } = await validateSession();
    const offers = await OfferService.getPromotionalOffers(tenantId);
    return { success: true, data: serializePrisma(offers) };
  } catch (error: any) {
    console.error('Error getting promotional offers:', error);
    return { success: false, error: error.message || 'Failed to load offers', data: [] };
  }
}

export async function updatePromotionalOfferAction(
  offerId: string,
  data: Partial<CreatePromotionalOfferInput>
) {
  try {
    const { tenantId } = await validateSession();
    const updated = await OfferService.updatePromotionalOffer(tenantId, offerId, data);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('Error updating promotional offer:', error);
    return { success: false, error: error.message || 'Failed to update offer' };
  }
}

export async function deletePromotionalOfferAction(offerId: string) {
  try {
    const { tenantId } = await validateSession();
    const deleted = await OfferService.deletePromotionalOffer(tenantId, offerId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return { success: true, data: serializePrisma(deleted) };
  } catch (error: any) {
    console.error('Error deleting promotional offer:', error);
    return { success: false, error: error.message || 'Failed to delete offer' };
  }
}

export async function broadcastOfferToCustomersAction(offerId: string) {
  try {
    const { tenantId } = await validateSession();
    const broadcastResult = await OfferService.broadcastOfferToCustomers(tenantId, offerId);
    revalidatePath('/packages');
    revalidatePath('/sales/packages');
    return { success: true, data: serializePrisma(broadcastResult) };
  } catch (error: any) {
    console.error('Error broadcasting offer:', error);
    return { success: false, error: error.message || 'Failed to broadcast offer' };
  }
}
