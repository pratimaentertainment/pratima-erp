'use server';

import { AuthService } from '@/services/auth.service';
import { headers } from 'next/headers';
import { auth, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export interface LoginActionResult {
  success?: boolean;
  redirectTo?: string;
  error?: string;
}

export async function loginAction(formData: FormData): Promise<LoginActionResult | void> {
  const rawData = Object.fromEntries(formData);
  const email = (rawData.email as string)?.trim().toLowerCase();
  const password = rawData.password as string;
  const remember = rawData.remember === 'true';
  const rawRedirectTo = (rawData.redirectTo as string) || '/dashboard';
  const redirectTo = rawRedirectTo.startsWith('/') && !rawRedirectTo.startsWith('//')
    ? rawRedirectTo
    : '/dashboard';

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    // Calling signIn without redirect: false allows NextAuth to natively throw NEXT_REDIRECT.
    // This throw is REQUIRED for Next.js to attach the Set-Cookie headers to the response.
    await signIn('credentials', {
      email,
      password,
      remember: remember ? 'true' : 'false',
      redirectTo,
    });
  } catch (error: any) {
    // CRITICAL: Must re-throw NEXT_REDIRECT to allow Next.js to attach Set-Cookie headers and redirect!
    if (
      isRedirectError(error) ||
      error?.message === 'NEXT_REDIRECT' ||
      error?.digest?.startsWith?.('NEXT_REDIRECT')
    ) {
      throw error;
    }

    console.error('Login action authentication failure:', error);

    if (error instanceof AuthError || error?.name === 'AuthError') {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Invalid email or password.' };
        case 'CallbackRouteError':
          return { 
            success: false, 
            error: error.cause?.err?.message || 'Authentication failed. Please verify your credentials.' 
          };
        case 'AccessDenied':
          return { 
            success: false, 
            error: 'Access denied. Your account may be inactive, locked, or restricted.' 
          };
        default:
          return { 
            success: false, 
            error: error.message || 'Something went wrong during sign in. Please try again.' 
          };
      }
    }

    const msg = error?.message || '';
    if (msg.includes('Invalid credentials') || msg.includes('CredentialsSignin')) {
      return { success: false, error: 'Invalid email or password.' };
    }
    if (msg.includes('not active') || msg.includes('deactivated')) {
      return { success: false, error: 'Account is not active or has been deactivated. Please contact an administrator.' };
    }
    if (msg.includes('locked')) {
      return { success: false, error: msg };
    }
    if (msg.includes('not authorized')) {
      return { success: false, error: 'This account is not authorized for portal login.' };
    }
    if (msg.includes('credentials configured')) {
      return { success: false, error: 'No login credentials configured for this account.' };
    }

    return {
      success: false,
      error: msg || 'An unexpected error occurred during sign in. Please try again.',
    };
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
    const session = await auth();
    if (!session?.user || session.user.id !== userId) {
      return { success: false, error: 'Unauthorized: You can only update your own password.' };
    }

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
    const session = await auth();
    if (!session?.user || session.user.id !== userId) {
      return { success: false, error: 'Unauthorized: Session management requires user authorization.' };
    }

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
    const session = await auth();
    if (!session?.user || session.user.id !== userId) {
      return { success: false, error: 'Unauthorized: Session management requires user authorization.' };
    }

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;
    await AuthService.revokeAllOtherSessions(tenantId, userId, currentSessionId, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
