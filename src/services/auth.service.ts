import { AuthRepository } from '@/repositories/auth.repository';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendSecurityOtpEmail } from '@/lib/mailer';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESET_SESSION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

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

export class AuthService {
  /**
   * Log an authentication audit event
   */
  static async logAuthEvent(tenantId: string | null | undefined, userId: string, action: string, ipAddress?: string) {
    if (!tenantId) return;
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          entityType: 'User',
          entityId: userId,
          ipAddress,
        },
      });
    } catch (err) {
      console.error('[AuthService.logAuthEvent] Non-fatal log failure:', err);
    }
  }

  /**
   * Validates credentials and handles lockouts/failed attempts.
   */
  static async validateCredentials(email: string, passwordString: string, ipAddress?: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      include: { branches: { where: { isActive: true } } }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'ACTIVE' || !user.isActive) {
      throw new Error('Account is not active or has been deactivated.');
    }

    if (!user.canLogin) {
      throw new Error('This account is not authorized for portal login.');
    }

    if (!user.passwordHash) {
      throw new Error('No login credentials configured for this account.');
    }

    // Check account lockout
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      await this.logAuthEvent(user.tenantId, user.id, 'LOGIN_BLOCKED_LOCKED', ipAddress);
      throw new Error(`Account is locked until ${user.lockUntil.toLocaleTimeString()}`);
    }

    const isValid = await bcrypt.compare(passwordString, user.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      let isLocked = false;
      let lockUntil = null;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        isLocked = true;
        lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.logAuthEvent(user.tenantId, user.id, 'ACCOUNT_LOCKED', ipAddress);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, isLocked, lockUntil },
      });

      await this.logAuthEvent(user.tenantId, user.id, 'LOGIN_FAILED', ipAddress);
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.logAuthEvent(user.tenantId, user.id, 'LOGIN_SUCCESS', ipAddress);

    return user;
  }

  /**
   * Create a new login session
   */
  static async createSession(userId: string, ipAddress?: string, browser?: string, os?: string, device?: string) {
    return AuthRepository.createLoginSession({
      userId,
      ipAddress,
      browser,
      operatingSystem: os,
      deviceType: device,
      status: 'ACTIVE',
    });
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(tenantId: string, userId: string, sessionId: string, ipAddress?: string) {
    const session = await AuthRepository.findSessionById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');

    await AuthRepository.updateSession(sessionId, { status: 'REVOKED', logoutAt: new Date() });
    await this.logAuthEvent(tenantId, userId, 'SESSION_REVOKED', ipAddress);
  }

  /**
   * Revoke all other sessions
   */
  static async revokeAllOtherSessions(tenantId: string, userId: string, currentSessionId: string, ipAddress?: string) {
    await AuthRepository.revokeAllUserSessionsExcept(userId, currentSessionId);
    await this.logAuthEvent(tenantId, userId, 'LOGOUT_OTHER_SESSIONS', ipAddress);
  }
  
  /**
   * Revoke all sessions (Logout all)
   */
  static async revokeAllSessions(tenantId: string, userId: string, ipAddress?: string) {
    await AuthRepository.revokeAllUserSessionsExcept(userId, 'NONE');
    await this.logAuthEvent(tenantId, userId, 'LOGOUT_ALL', ipAddress);
  }

  /**
   * Check if password has been used in last 5 times
   */
  static async checkPasswordHistory(userId: string, newPasswordStr: string) {
    const history = await AuthRepository.findUserPasswordHistory(userId, 5);
    for (const record of history) {
      if (await bcrypt.compare(newPasswordStr, record.passwordHash)) {
        throw new Error('Password was recently used. Please choose a different password for your security.');
      }
    }
  }

  // =========================================================================
  // AUTOMATIC 3-STEP FORGOT PASSWORD (6-DIGIT EMAIL OTP FLOW)
  // =========================================================================

  /**
   * Step 1: Request 6-digit OTP for Forgot Password
   */
  static async requestPasswordResetOtp(email: string, ipAddress?: string): Promise<{
    success: boolean;
    maskedEmail?: string;
    message: string;
  }> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    // Anti-enumeration: Return generic success if account does not exist or cannot login
    if (!user || !user.canLogin || !user.isActive) {
      return {
        success: true,
        maskedEmail: maskEmail(normalizedEmail),
        message: 'If an account matches this email, a 6-digit verification code has been dispatched.',
      };
    }

    // Invalidate any previously un-consumed reset OTP tokens for this user
    await prisma.token.updateMany({
      where: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await AuthRepository.createToken({
      userId: user.id,
      type: 'RESET_PASSWORD',
      token: hashedOtp,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      attempts: 0,
    });

    await this.logAuthEvent(user.tenantId, user.id, 'PASSWORD_RESET_OTP_REQUESTED', ipAddress);

    // Send transactional branded email
    await sendSecurityOtpEmail({
      to: user.email,
      userName: user.name,
      otp,
      purpose: 'FORGOT_PASSWORD',
    });

    return {
      success: true,
      maskedEmail: maskEmail(user.email),
      message: `A 6-digit verification code has been sent to ${maskEmail(user.email)}. It expires in 10 minutes.`,
    };
  }

  /**
   * Step 2: Verify 6-digit OTP and issue a short-lived reset session token
   */
  static async verifyPasswordResetOtp(email: string, otp: string, ipAddress?: string): Promise<{
    success: boolean;
    resetSessionToken: string;
  }> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim().replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification session.');
    }

    const tokenRecord = await prisma.token.findFirst({
      where: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      throw new Error('Verification code has expired or was not requested. Please request a new code.');
    }

    // Check brute-force attempts on this OTP
    if (tokenRecord.attempts >= 5) {
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });
      throw new Error('Too many invalid attempts. For your security, this code has been deactivated. Please request a new one.');
    }

    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    if (hashedInput !== tokenRecord.token) {
      const nextAttempts = tokenRecord.attempts + 1;
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { attempts: nextAttempts },
      });
      const remaining = Math.max(0, 5 - nextAttempts);
      throw new Error(`Invalid verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`);
    }

    // Mark OTP token as used
    await prisma.token.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Issue short-lived verified reset session token
    const resetSessionToken = crypto.randomBytes(32).toString('hex');
    await AuthRepository.createToken({
      userId: user.id,
      type: 'TEMPORARY_PASSWORD',
      token: resetSessionToken,
      expiresAt: new Date(Date.now() + RESET_SESSION_EXPIRY_MS),
      attempts: 0,
    });

    await this.logAuthEvent(user.tenantId, user.id, 'PASSWORD_RESET_OTP_VERIFIED', ipAddress);

    return {
      success: true,
      resetSessionToken,
    };
  }

  /**
   * Step 3: Complete Password Reset with Verified Reset Session Token
   */
  static async completePasswordReset(resetSessionToken: string, newPasswordStr: string, ipAddress?: string): Promise<{
    success: boolean;
  }> {
    if (!resetSessionToken) {
      throw new Error('Missing verification session token.');
    }

    validatePasswordStrength(newPasswordStr);

    const tokenRecord = await prisma.token.findFirst({
      where: {
        token: resetSessionToken,
        type: 'TEMPORARY_PASSWORD',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new Error('Password reset session has expired. Please verify your email again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user) {
      throw new Error('User account not found.');
    }

    await this.checkPasswordHistory(user.id, newPasswordStr);

    const passwordHash = await bcrypt.hash(newPasswordStr, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          isLocked: false,
          lockUntil: null,
        },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      }),
      prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      ...(user.tenantId
        ? [
            prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.id,
                action: 'PASSWORD_RESET_COMPLETED',
                entityType: 'User',
                entityId: user.id,
                ipAddress,
              },
            }),
          ]
        : []),
      prisma.loginSession.updateMany({
        where: { userId: user.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', logoutAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  // =========================================================================
  // AUTHENTICATED PROFILE PASSWORD CHANGE WITH EMAIL OTP VERIFICATION
  // =========================================================================

  /**
   * Send Verification OTP to authenticated user's registered email before password change
   */
  static async requestProfilePasswordChangeOtp(userId: string, currentPasswordStr: string, ipAddress?: string): Promise<{
    success: boolean;
    maskedEmail: string;
    message: string;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    if (!user.passwordHash) throw new Error('No password configured for this account.');

    const isValid = await bcrypt.compare(currentPasswordStr, user.passwordHash);
    if (!isValid) throw new Error('Current password is incorrect.');

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

    await AuthRepository.createToken({
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      token: hashedOtp,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      attempts: 0,
    });

    await this.logAuthEvent(user.tenantId, user.id, 'PROFILE_PASSWORD_OTP_REQUESTED', ipAddress);

    await sendSecurityOtpEmail({
      to: user.email,
      userName: user.name,
      otp,
      purpose: 'CHANGE_PASSWORD',
    });

    return {
      success: true,
      maskedEmail: maskEmail(user.email),
      message: `A 6-digit security code has been sent to ${maskEmail(user.email)}.`,
    };
  }

  /**
   * Update password for authenticated user after OTP verification
   */
  static async changePasswordWithOtp(
    userId: string,
    currentPasswordStr: string,
    otp: string,
    newPasswordStr: string,
    ipAddress?: string
  ): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    if (!user.passwordHash) throw new Error('User has no existing password configured.');

    const isCurrentValid = await bcrypt.compare(currentPasswordStr, user.passwordHash);
    if (!isCurrentValid) throw new Error('Current password is incorrect.');

    const cleanOtp = (otp || '').trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      throw new Error('Please provide the 6-digit email verification code.');
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
      throw new Error('Verification code has expired or was not requested. Please click "Send Verification Code" first.');
    }

    if (tokenRecord.attempts >= 5) {
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });
      throw new Error('Too many invalid attempts. Please request a new verification code.');
    }

    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    if (hashedInput !== tokenRecord.token) {
      const nextAttempts = tokenRecord.attempts + 1;
      await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { attempts: nextAttempts },
      });
      const remaining = Math.max(0, 5 - nextAttempts);
      throw new Error(`Invalid verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`);
    }

    validatePasswordStrength(newPasswordStr);
    await this.checkPasswordHistory(user.id, newPasswordStr);

    const passwordHash = await bcrypt.hash(newPasswordStr, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
        },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      }),
      prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      ...(user.tenantId
        ? [
            prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.id,
                action: 'PASSWORD_CHANGED',
                entityType: 'User',
                entityId: user.id,
                ipAddress,
              },
            }),
          ]
        : []),
    ]);

    return { success: true };
  }

  // =========================================================================
  // BACKWARD-COMPATIBLE FALLBACK METHODS
  // =========================================================================

  static async requestPasswordReset(email: string, ipAddress?: string) {
    return this.requestPasswordResetOtp(email, ipAddress);
  }

  static async resetPassword(tokenStr: string, newPasswordStr: string, ipAddress?: string) {
    return this.completePasswordReset(tokenStr, newPasswordStr, ipAddress);
  }

  static async changePassword(userId: string, currentPasswordStr: string, newPasswordStr: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (!user.passwordHash) throw new Error('User has no existing password configured');

    const isValid = await bcrypt.compare(currentPasswordStr, user.passwordHash);
    if (!isValid) throw new Error('Current password is incorrect');

    validatePasswordStrength(newPasswordStr);
    await this.checkPasswordHistory(user.id, newPasswordStr);

    const passwordHash = await bcrypt.hash(newPasswordStr, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
        },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      }),
      ...(user.tenantId
        ? [
            prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.id,
                action: 'PASSWORD_CHANGED',
                entityType: 'User',
                entityId: user.id,
                ipAddress,
              },
            }),
          ]
        : []),
    ]);
  }
}
