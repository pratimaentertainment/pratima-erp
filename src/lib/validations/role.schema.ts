import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(50),
  description: z.string().max(255).optional().default(''),
});

export type RoleInput = z.infer<typeof roleSchema>;

export const cloneRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(50),
});

export type CloneRoleInput = z.infer<typeof cloneRoleSchema>;
