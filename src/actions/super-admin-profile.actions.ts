'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendSecurityOtpEmail } from '@/lib/mailer';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}***@${domain}`;
  }
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least one special character.');
  }
}

/**
 * Strict Security Guard: Ensures caller is an active authenticated SUPER_ADMIN
 */
async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !user || !user.id) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const role = user.role;
  const roles = user.roles || [];
  const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin) {
    throw new Error('Forbidden: Super Admin privileges required.');
  }

  return {
    userId: user.id as string,
    email: (user.email || process.env.SUPER_ADMIN_EMAIL || 'framiqbypratima@gmail.com') as string,
    name: (user.name || 'Platform Super Admin') as string,
    sessionId: user.sessionId as string | undefined,
  };
}

/**
 * 1. Fetch Super Admin profile details and active login sessions
 */
export async function getSuperAdminProfileAction() {
  try {
    const admin = await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        loginSessions: {
          where: { status: 'ACTIVE' },
          orderBy: { loginAt: 'desc' },
          take: 10,
          select: {
            id: true,
            loginAt: true,
            ipAddress: true,
            browser: true,
            operatingSystem: true,
            deviceType: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User record not found.' };
    }

    return {
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
      },
      sessions: user.loginSessions.map((s) => ({
        id: s.id,
        loginAt: s.loginAt.toISOString(),
        ipAddress: s.ipAddress || 'Unknown IP',
        browser: s.browser || 'Unknown Browser',
        operatingSystem: s.operatingSystem || 'Unknown OS',
        deviceType: s.deviceType || 'Desktop',
        status: s.status || 'ACTIVE',
        isCurrent: s.id === admin.sessionId,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch admin profile.' };
  }
}

/**
 * 2. Update Super Admin name and phone details
 */
export async function updateSuperAdminDetailsAction(data: { name: string; phone?: string }) {
  try {
    const admin = await requireSuperAdmin();
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    const trimmedName = (data.name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Full Name must be at least 2 characters long.' };
    }

    const trimmedPhone = (data.phone || '').trim();

    const user = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    await prisma.user.update({
      where: { id: admin.userId },
      data: {
        name: trimmedName,
        phone: trimmedPhone || null,
      },
    });

    if (user.tenantId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: admin.userId,
            action: 'SUPER_ADMIN_PROFILE_UPDATED',
            entityType: 'User',
            entityId: admin.userId,
            ipAddress,
          },
        });
      } catch (e) {
        // Non-fatal
      }
    }

    revalidatePath('/super-admin/profile');
    revalidatePath('/super-admin');

    return { success: true, message: 'Profile details updated successfully.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}

/**
 * 3. Request 6-digit verification OTP to Super Admin email before password change
 */
export async function requestSuperAdminPasswordOtpAction() {
  try {
    const admin = await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    // Invalidate previous active OTPs
    await prisma.token.updateMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: hashedOtp,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        attempts: 0,
      },
    });

    await sendSecurityOtpEmail({
      to: user.email,
      userName: user.name,
      otp,
      purpose: 'CHANGE_PASSWORD',
    });

    return {
      success: true,
      maskedEmail: maskEmail(user.email),
      message: `A 6-digit verification code has been dispatched to ${maskEmail(user.email)}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send verification code.' };
  }
}

/**
 * 4. Change Super Admin password (2FA Verified via 6-digit OTP + Current Password + Password History)
 */
export async function changeSuperAdminPasswordAction(data: {
  currentPassword: string;
  otpCode: string;
  newPassword: string;
}) {
  try {
    const admin = await requireSuperAdmin();
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for') || undefined;

    const user = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: { id: true, passwordHash: true, tenantId: true },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Account credentials not found.' };
    }

    // 1. Verify current password
    const isCurrentValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    // 2. Verify 6-digit OTP
    const cleanOtp = (data.otpCode || '').trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter the 6-digit verification code.' };
    }

    const tokenRecord = await prisma.token.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: 'Verification code has expired or was not requested. Please click "Send Email OTP" first.',
      };
    }

    if (tokenRecord.attempts >= 5) {
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });
      return { success: false, error: 'Too many invalid attempts. Please request a new verification code.' };
    }

    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (hashedInput !== tokenRecord.token) {
      const nextAttempts = tokenRecord.attempts + 1;
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { attempts: nextAttempts },
      });
      const remaining = Math.max(0, 5 - nextAttempts);
      return {
        success: false,
        error: `Invalid verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
      };
    }

    // 3. Enforce password strength
    validatePasswordStrength(data.newPassword);

    // 4. Enforce 5-generation password history
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const h of history) {
      if (await bcrypt.compare(data.newPassword, h.passwordHash)) {
        return {
          success: false,
          error: 'This password was used recently. Please choose a different password for security.',
        };
      }
    }

    // 5. Hash new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // 6. Transactionally update password, history, consume token, and revoke other sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          isLocked: false,
          lockUntil: null,
        },
      }),
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: newPasswordHash,
        },
      }),
      prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all other active sessions except the current one
      prisma.loginSession.updateMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          ...(admin.sessionId ? { id: { not: admin.sessionId } } : {}),
        },
        data: {
          status: 'REVOKED',
          logoutAt: new Date(),
        },
      }),
    ]);

    if (user.tenantId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'SUPER_ADMIN_PASSWORD_CHANGED',
            entityType: 'User',
            entityId: user.id,
            ipAddress,
          },
        });
      } catch (e) {
        // Non-fatal
      }
    }

    revalidatePath('/super-admin/profile');
    return { success: true, message: 'Password updated successfully! Other active sessions have been revoked.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to change password.' };
  }
}

/**
 * 5. Revoke a specific active login session
 */
export async function revokeSuperAdminSessionAction(sessionId: string) {
  try {
    const admin = await requireSuperAdmin();

    const session = await prisma.loginSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== admin.userId) {
      return { success: false, error: 'Session not found or unauthorized.' };
    }

    await prisma.loginSession.update({
      where: { id: sessionId },
      data: {
        status: 'REVOKED',
        logoutAt: new Date(),
      },
    });

    revalidatePath('/super-admin/profile');
    return { success: true, message: 'Session revoked successfully.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke session.' };
  }
}
