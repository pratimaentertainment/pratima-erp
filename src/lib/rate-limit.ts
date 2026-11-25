/**
 * Edge-Compatible Enterprise In-Memory Rate Limiter for FRAMIQ (Next.js 16)
 *
 * Implements a time-windowed token/request counter per client identifier (IP).
 * Compatible with Edge Runtime (V8 isolate) and Node.js server environments.
 * Automatically cleans up expired windows to ensure zero memory leaks.
 */

export interface RateLimitOptions {
  limit: number;     // Maximum allowed requests within the window
  windowMs: number;  // Window duration in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds when the window resets
  retryAfter: number; // Seconds until user can retry
}

interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 30 * 1000; // Clean expired entries every 30s
  private readonly maxEntries = 10000; // Cap map size to prevent unbounded memory growth

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupIntervalMs && this.store.size < this.maxEntries) {
      return;
    }
    this.lastCleanup = now;

    for (const [key, record] of this.store.entries()) {
      if (record.resetTimeMs <= now) {
        this.store.delete(key);
      }
    }

    // If still over cap after pruning expired, remove oldest entries
    if (this.store.size > this.maxEntries) {
      const keysToDelete = Array.from(this.store.keys()).slice(0, 2000);
      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }
  }

  public check(key: string, limit: number, windowMs: number): RateLimitResult {
    this.cleanup();

    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetTimeMs <= now) {
      const resetTimeMs = now + windowMs;
      this.store.set(key, { count: 1, resetTimeMs });
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetTime: Math.ceil(resetTimeMs / 1000),
        retryAfter: 0,
      };
    }

    if (existing.count < limit) {
      existing.count += 1;
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - existing.count),
        resetTime: Math.ceil(existing.resetTimeMs / 1000),
        retryAfter: 0,
      };
    }

    const retryAfter = Math.max(1, Math.ceil((existing.resetTimeMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime: Math.ceil(existing.resetTimeMs / 1000),
      retryAfter,
    };
  }
}

// Global singleton instance
const globalLimiter = new MemoryRateLimiter();

/**
 * Extracts the true client IP address from standard reverse proxy headers.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

/**
 * Maps incoming pathname to dedicated rate limit thresholds.
 */
export function getRateLimitConfig(pathname: string): RateLimitOptions {
  // 1. High-Risk Auth & Credential Endpoints: 15 requests / 60 seconds
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return { limit: 15, windowMs: 60 * 1000 };
  }

  // 2. Public Forms & Portals (Guest Lead capture, Client Portals, Quotes): 45 requests / 60 seconds
  if (
    pathname.startsWith('/guest') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/quote') ||
    pathname.startsWith('/gallery')
  ) {
    return { limit: 45, windowMs: 60 * 1000 };
  }

  // 3. API Webhooks & Integration Handlers: 60 requests / 60 seconds
  if (pathname.startsWith('/api/')) {
    return { limit: 60, windowMs: 60 * 1000 };
  }

  // 4. Default unauthenticated page requests: 120 requests / 60 seconds
  return { limit: 120, windowMs: 60 * 1000 };
}

/**
 * Evaluates rate limit for a request.
 */
export function checkRateLimit(
  ip: string,
  pathname: string,
  customOptions?: Partial<RateLimitOptions>
): RateLimitResult {
  const defaults = getRateLimitConfig(pathname);
  const limit = customOptions?.limit ?? defaults.limit;
  const windowMs = customOptions?.windowMs ?? defaults.windowMs;

  const key = `${ip}:${pathname.split('/')[1] || 'root'}`;
  return globalLimiter.check(key, limit, windowMs);
}
