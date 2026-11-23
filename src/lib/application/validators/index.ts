import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const sortSchema = z.string().optional();

export const uuidSchema = z.string().uuid();

export const bulkIdsSchema = z.array(z.string().uuid()).min(1);

export class BaseValidator {
  static validate<T>(schema: z.Schema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`Validation Error: ${issues.join(', ')}`);
    }
    return result.data;
  }
}
