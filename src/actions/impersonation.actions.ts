'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_TTL_MS,
  signImpersonationToken,
  getActiveImpersonationState,
  type ImpersonationState,
} from '@/lib/impersonation';

/**
 * Strict Security Guard: Ensures the caller is authenticated as a SUPER_ADMIN.
 */
async function requireSuperAdminSession() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !user || !user.id) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const role = user.role;
  const roles = user.roles || [];
  const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin) {
    throw new Error('Forbidden: Super Admin privileges required for support impersonation.');
  }

  return {
    userId: user.id as string,
    email: (user.email || 'superadmin@pratimaerp.com') as string,
    name: (user.name || 'Platform Super Admin') as string,
  };
}

/**
 * Initiates an audited 15-minute support impersonation session into the target studio tenant.
 */
export async function startTenantImpersonationAction(tenantId: string) {
  try {
    const superAdmin = await requireSuperAdminSession();

    if (!tenantId || typeof tenantId !== 'string') {
      return { success: false, error: 'Valid Tenant ID is required.' };
    }

    // Verify target tenant exists and fetch essential identity metadata
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
      },
    });

    if (!tenant) {
      return { success: false, error: 'Target studio tenant was not found.' };
    }

    const now = Date.now();
    const expiresAt = now + IMPERSONATION_TTL_MS;

    const payload: ImpersonationState = {
      superAdminId: superAdmin.userId,
      superAdminEmail: superAdmin.email,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      issuedAt: now,
      expiresAt,
    };

    const token = signImpersonationToken(payload);

    // Set cryptographically signed HttpOnly cookie with 15-minute TTL
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(IMPERSONATION_TTL_MS / 1000), // 900 seconds
    });

    // Write immutable compliance audit log
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: superAdmin.userId,
        action: 'SUPER_ADMIN_IMPERSONATION_START',
        entityType: 'Tenant',
        entityId: tenant.id,
        newValues: {
          operatorUserId: superAdmin.userId,
          operatorEmail: superAdmin.email,
          targetStudioName: tenant.name,
          targetStudioSlug: tenant.slug,
          subscriptionStatus: tenant.subscriptionStatus,
          sessionStartedAt: new Date(now).toISOString(),
          sessionExpiresAt: new Date(expiresAt).toISOString(),
          ttlMinutes: 15,
        },
      },
    });

    revalidatePath('/', 'layout');

    return {
      success: true,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        expiresAt,
      },
      redirectUrl: '/dashboard',
    };
  } catch (error: any) {
    console.error('[START_IMPERSONATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize studio impersonation session.',
    };
  }
}

/**
 * Terminates the active support impersonation session, deletes the cookie, and logs the end event.
 */
export async function stopTenantImpersonationAction() {
  try {
    const currentState = await getActiveImpersonationState();

    if (currentState) {
      // Write termination audit log
      await prisma.auditLog.create({
        data: {
          tenantId: currentState.tenantId,
          userId: currentState.superAdminId,
          action: 'SUPER_ADMIN_IMPERSONATION_END',
          entityType: 'Tenant',
          entityId: currentState.tenantId,
          oldValues: {
            operatorUserId: currentState.superAdminId,
            operatorEmail: currentState.superAdminEmail,
            targetStudioName: currentState.tenantName,
            targetStudioSlug: currentState.tenantSlug,
            sessionTerminatedAt: new Date().toISOString(),
          },
        },
      });
    }

    // Clear the impersonation cookie
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE_NAME);

    revalidatePath('/', 'layout');

    return {
      success: true,
      redirectUrl: '/super-admin',
    };
  } catch (error: any) {
    console.error('[STOP_IMPERSONATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to terminate studio impersonation session.',
    };
  }
}
