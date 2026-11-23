import { z } from 'zod';

export const checkoutEquipmentSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  subEventId: z.string().uuid('Invalid sub-event ID').optional(),
  shootId: z.string().uuid('Invalid shoot ID').optional(),
});

export type CheckoutEquipmentFormValues = z.infer<typeof checkoutEquipmentSchema>;
