import { z } from 'zod';

export const callSheetSchema = z.object({
  shootId: z.string().uuid('Invalid Shoot ID'),
  clientInstructions: z.string().optional().nullable(),
  shotList: z.array(z.string()),
  moodboardLinks: z.array(z.string().url('Invalid URL format for moodboard link')),
});

export const callSheetUpdateSchema = callSheetSchema.omit({ shootId: true }).partial();

export type CallSheetCreateInput = z.infer<typeof callSheetSchema>;
export type CallSheetUpdateInput = z.infer<typeof callSheetUpdateSchema>;
