import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class AuthRepository {
  static async createLoginSession(data: Prisma.LoginSessionUncheckedCreateInput) {
    return prisma.loginSession.create({ data });
  }

  static async findSessionById(sessionId: string) {
    return prisma.loginSession.findUnique({
      where: { id: sessionId },
    });
  }

  static async updateSession(sessionId: string, data: Prisma.LoginSessionUncheckedUpdateInput) {
    return prisma.loginSession.update({
      where: { id: sessionId },
      data,
    });
  }

  static async revokeAllUserSessionsExcept(userId: string, currentSessionId: string) {
    return prisma.loginSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        logoutAt: new Date(),
      },
    });
  }

  static async findActiveSessionsForUser(userId: string) {
    return prisma.loginSession.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { loginAt: 'desc' },
    });
  }

  static async findLoginHistoryForUser(userId: string, take: number = 20) {
    return prisma.loginSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take,
    });
  }

  static async createToken(data: Prisma.TokenUncheckedCreateInput) {
    return prisma.token.create({ data });
  }

  static async findToken(tokenStr: string, type: 'RESET_PASSWORD' | 'EMAIL_VERIFICATION' | 'TEMPORARY_PASSWORD') {
    return prisma.token.findFirst({
      where: { token: tokenStr, type },
    });
  }

  static async invalidateToken(tokenId: string) {
    return prisma.token.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  static async findUserPasswordHistory(userId: string, take: number = 5) {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
