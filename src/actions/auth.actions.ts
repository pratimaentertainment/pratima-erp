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
  let redirectTo = rawRedirectTo.startsWith('/') && !rawRedirectTo.startsWith('//')
    ? rawRedirectTo
    : '/dashboard';

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Direct super admin logins to /super-admin if default /dashboard was targeted
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'framiqbypratima@gmail.com').toLowerCase();
  if (email === superAdminEmail && redirectTo === '/dashboard') {
    redirectTo = '/super-admin';
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

// =========================================================================
// 3-STEP AUTOMATIC FORGOT PASSWORD (EMAIL 6-DIGIT OTP) ACTIONS
// =========================================================================

/**
 * Step 1: Request 6-digit OTP to registered email
 */
export async function forgotPasswordRequestOtpAction(email: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    const result = await AuthService.requestPasswordResetOtp(email, ipAddress);
    return {
      success: true,
      maskedEmail: result.maskedEmail,
      message: result.message,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispatch verification code.' };
  }
}

/**
 * Step 2: Verify 6-digit OTP and get verified reset session token
 */
export async function forgotPasswordVerifyOtpAction(email: string, otp: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    const result = await AuthService.verifyPasswordResetOtp(email, otp, ipAddress);
    return {
      success: true,
      resetSessionToken: result.resetSessionToken,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Verification failed.' };
  }
}

/**
 * Step 3: Complete Password Reset with New Password
 */
export async function forgotPasswordResetAction(resetSessionToken: string, newPassword: string) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    await AuthService.completePasswordReset(resetSessionToken, newPassword, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update password.' };
  }
}

// =========================================================================
// AUTHENTICATED PROFILE PASSWORD ACTIONS (WITH OTP VERIFICATION)
// =========================================================================

/**
 * Request OTP for authenticated password change
 */
export async function requestProfileChangePasswordOtpAction(currentPassword: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Session required.' };
    }

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    const result = await AuthService.requestProfilePasswordChangeOtp(session.user.id, currentPassword, ipAddress);
    return {
      success: true,
      maskedEmail: result.maskedEmail,
      message: result.message,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispatch verification code.' };
  }
}

/**
 * Update authenticated password with OTP
 */
export async function changePasswordWithOtpAction(currentPassword: string, otp: string, newPassword: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Session required.' };
    }

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    await AuthService.changePasswordWithOtp(session.user.id, currentPassword, otp, newPassword, ipAddress);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to change password.' };
  }
}

// =========================================================================
// BACKWARD-COMPATIBLE ACTIONS
// =========================================================================

export async function forgotPasswordAction(email: string) {
  return forgotPasswordRequestOtpAction(email);
}

export async function resetPasswordAction(token: string, password: string) {
  return forgotPasswordResetAction(token, password);
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
