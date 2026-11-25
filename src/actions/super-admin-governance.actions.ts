'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { BroadcastSeverity } from '@prisma/client';

/**
 * Strict Security Guard: Ensures caller is an active SUPER_ADMIN
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
    throw new Error('Forbidden: Super Admin role required for platform governance.');
  }

  return {
    userId: user.id as string,
    email: (user.email || 'suhaswagire.photo@gmail.com') as string,
    name: (user.name || 'Platform Super Admin') as string,
  };
}

// ------------------------------------------------------
// AUDIT LOG GOVERNANCE
// ------------------------------------------------------

export interface AuditLogFilters {
  search?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function getGlobalAuditLogsAction(filters?: AuditLogFilters) {
  try {
    await requireSuperAdmin();

    const limit = Math.min(filters?.limit || 50, 100);
    const offset = filters?.offset || 0;
    const search = filters?.search?.trim();
    const actionFilter = filters?.action?.trim();

    const where: any = {};

    if (actionFilter && actionFilter !== 'ALL') {
      where.action = actionFilter;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        tenant: log.tenant,
        user: log.user,
      })),
      totalCount,
      limit,
      offset,
    };
  } catch (error: any) {
    console.error('[getGlobalAuditLogsAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch global security audit logs.',
      logs: [],
      totalCount: 0,
    };
  }
}

// ------------------------------------------------------
// SYSTEM BROADCAST DESK
// ------------------------------------------------------

const createBroadcastSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Broadcast title must be at least 3 characters')
    .max(150, 'Title must not exceed 150 characters'),
  message: z
    .string()
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(2000, 'Message must not exceed 2000 characters'),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL'] as const).default('INFO'),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

export async function createPlatformBroadcastAction(input: CreateBroadcastInput) {
  try {
    const superAdmin = await requireSuperAdmin();
    const validated = createBroadcastSchema.parse(input);

    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null;

    const broadcast = await prisma.platformBroadcast.create({
      data: {
        title: validated.title,
        message: validated.message,
        severity: validated.severity as BroadcastSeverity,
        isActive: validated.isActive,
        expiresAt,
        createdById: superAdmin.userId,
      },
    });

    revalidatePath('/super-admin/settings');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'System announcement broadcasted successfully.',
      broadcast: {
        id: broadcast.id,
        title: broadcast.title,
      },
    };
  } catch (error: any) {
    console.error('[createPlatformBroadcastAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create platform broadcast.',
    };
  }
}

export async function deactivatePlatformBroadcastAction(broadcastId: string) {
  try {
    await requireSuperAdmin();

    if (!broadcastId) {
      return { success: false, error: 'Broadcast ID is required.' };
    }

    await prisma.platformBroadcast.update({
      where: { id: broadcastId },
      data: { isActive: false },
    });

    revalidatePath('/super-admin/settings');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Platform announcement deactivated successfully.',
    };
  } catch (error: any) {
    console.error('[deactivatePlatformBroadcastAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to deactivate platform broadcast.',
    };
  }
}

export async function getAllPlatformBroadcastsAction() {
  try {
    await requireSuperAdmin();

    const broadcasts = await prisma.platformBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      broadcasts: broadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        severity: b.severity,
        isActive: b.isActive,
        expiresAt: b.expiresAt ? b.expiresAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        createdBy: b.createdBy,
      })),
    };
  } catch (error: any) {
    console.error('[getAllPlatformBroadcastsAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch platform broadcasts.',
      broadcasts: [],
    };
  }
}

/**
 * Public/Dashboard Query: Returns the latest active, unexpired system broadcast (if any).
 */
export async function getActivePlatformBroadcast() {
  try {
    const broadcast = await prisma.platformBroadcast.findFirst({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        severity: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!broadcast) return null;

    return {
      id: broadcast.id,
      title: broadcast.title,
      message: broadcast.message,
      severity: broadcast.severity,
      expiresAt: broadcast.expiresAt ? broadcast.expiresAt.toISOString() : null,
      createdAt: broadcast.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}
