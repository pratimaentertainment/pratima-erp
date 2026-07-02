 
 
'use server';

import { AuthService } from '@/services/auth.service';
import { headers } from 'next/headers';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  try {
    await signIn('credentials', Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials.' };
        case 'CallbackRouteError':
          return { error: error.cause?.err?.message || 'Authentication error.' };
        default:
          return { error: 'Something went wrong.' };
      }
    }
    throw error; // Let next/navigation handle redirects
  }
}

export async function forgotPasswordAction(email: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    await AuthService.requestPasswordReset(email, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetPasswordAction(token: string, password: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    await AuthService.resetPassword(token, password, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changePasswordAction(userId: string, currentPass: string, newPass: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    await AuthService.changePassword(userId, currentPass, newPass, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function revokeSessionAction(tenantId: string, userId: string, sessionId: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;
    await AuthService.revokeSession(tenantId, userId, sessionId, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function revokeOtherSessionsAction(tenantId: string, userId: string, currentSessionId: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;
    await AuthService.revokeAllOtherSessions(tenantId, userId, currentSessionId, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
