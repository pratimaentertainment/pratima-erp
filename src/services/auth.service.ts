import { AuthRepository } from '@/repositories/auth.repository';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Log an authentication audit event
   */
  static async logAuthEvent(tenantId: string, userId: string, action: string, ipAddress?: string) {
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
  }

  /**
   * Validates credentials and handles lockouts/failed attempts.
   */
  static async validateCredentials(email: string, passwordString: string, ipAddress?: string) {
    // Note: This requires looking up across all tenants, or passing tenantId.
    // For this ERP, email + tenantId is unique, but login is usually by email. 
    // We assume email is unique globally for login purposes, or the user enters tenant subdomain.
    // Let's find first user by email.
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active.');
    }

    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
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
   * Forgot Password - Generate Token
   */
  static async requestPasswordReset(email: string, ipAddress?: string) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return; // Silent success to prevent email enumeration

    // Generate token
    const tokenStr = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await AuthRepository.createToken({
      userId: user.id,
      type: 'RESET_PASSWORD',
      token: tokenStr,
      expiresAt,
    });

    await this.logAuthEvent(user.tenantId, user.id, 'PASSWORD_RESET_REQUESTED', ipAddress);

    // TODO: Send email
    console.log(`\n\n[DEV] PASSWORD RESET URL: http://localhost:3000/reset-password?token=${tokenStr}\n\n`);
  }

  /**
   * Check if password has been used in last 5 times
   */
  static async checkPasswordHistory(userId: string, newPasswordStr: string) {
    const history = await AuthRepository.findUserPasswordHistory(userId, 5);
    for (const record of history) {
      if (await bcrypt.compare(newPasswordStr, record.passwordHash)) {
        throw new Error('Password was recently used. Please choose a different password.');
      }
    }
  }

  /**
   * Reset Password
   */
  static async resetPassword(tokenStr: string, newPasswordStr: string, ipAddress?: string) {
    const token = await AuthRepository.findToken(tokenStr, 'RESET_PASSWORD');
    
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) throw new Error('User not found');

    await this.checkPasswordHistory(user.id, newPasswordStr);

    const passwordHash = await bcrypt.hash(newPasswordStr, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      }),
      prisma.token.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
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
      // Invalidate all sessions
      prisma.loginSession.updateMany({
        where: { userId: user.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', logoutAt: new Date() },
      }),
    ]);
  }

  /**
   * Change Password (Authenticated)
   */
  static async changePassword(userId: string, currentPasswordStr: string, newPasswordStr: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(currentPasswordStr, user.passwordHash);
    if (!isValid) throw new Error('Current password is incorrect');

    await this.checkPasswordHistory(user.id, newPasswordStr);

    const passwordHash = await bcrypt.hash(newPasswordStr, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      }),
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
    ]);
  }
}
