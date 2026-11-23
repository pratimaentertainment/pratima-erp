// Simple in-memory cache for RBAC permissions.
// In a highly distributed environment, replace this with Redis.

const permissionCache = new Map<string, { permissions: any[]; expiresAt: number }>();
const roleCache = new Map<string, { role: string | null; expiresAt: number }>();

const TTL_MS = 1000 * 60 * 5; // 5 minutes

export const rbacCache = {
  get: (userId: string) => {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }
    permissionCache.delete(userId);
    return null;
  },

  set: (userId: string, permissions: any[]) => {
    permissionCache.set(userId, {
      permissions,
      expiresAt: Date.now() + TTL_MS
    });
  },

  getRole: (userId: string): string | null | undefined => {
    const cached = roleCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.role;
    }
    roleCache.delete(userId);
    return undefined;
  },

  setRole: (userId: string, role: string | null) => {
    roleCache.set(userId, {
      role,
      expiresAt: Date.now() + TTL_MS
    });
  },

  invalidateUser: (userId: string) => {
    permissionCache.delete(userId);
    roleCache.delete(userId);
  },

  // Calling this when a Role's permissions change to force all users to refresh
  invalidateAll: () => {
    permissionCache.clear();
    roleCache.clear();
  }
};
