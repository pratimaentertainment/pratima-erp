'use server';

import { revalidatePath } from 'next/cache';
import { UserService } from '@/services/user.service';
import { userSchema } from '@/lib/validations/user.schema';
import { auth } from '@/auth';
import { headers } from 'next/headers';

export async function createUser(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context required'); 
  const performedBy = session.user.id || null;

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

  const parsed = userSchema.parse(data);

  try {
    const { roles, branches, ...userData } = parsed;
    await UserService.createUser(tenantId, performedBy, userData, roles, branches, ipAddress);
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'PLAN_LIMIT_EXCEEDED') {
      return {
        success: false,
        error: error.message,
        code: 'PLAN_LIMIT_EXCEEDED',
        limit: error.limit,
        currentUsage: error.currentUsage,
      };
    }
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context required');
  const performedBy = session.user.id || null;
  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

  const parsed = userSchema.partial().parse(data);

  try {
    const { roles, branches, ...userData } = parsed;
    await UserService.updateUser(tenantId, id, performedBy, userData, roles, branches, ipAddress);
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context required');
  const performedBy = session.user.id || null;
  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

  try {
    await UserService.deleteUser(tenantId, id, performedBy, ipAddress);
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context required');
  const performedBy = session.user.id || null;
  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

  try {
    await UserService.toggleUserStatus(tenantId, id, status, performedBy, ipAddress);
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
