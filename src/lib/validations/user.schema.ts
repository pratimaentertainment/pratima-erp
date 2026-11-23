 
 
import * as z from 'zod';

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_INVITATION']),
  
  employeeCode: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  branches: z.array(z.string()),
});

export type UserFormValues = z.infer<typeof userSchema>;
