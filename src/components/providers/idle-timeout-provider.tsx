'use client';

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';

/**
 * Default timeout: strictly 30 minutes (1,800,000 ms)
 */
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/**
 * Throttle user activity event processing to at most once every 5 seconds
 * to prevent DOM / state overhead and ensure 60fps performance.
 */
const THROTTLE_INTERVAL_MS = 5000;
/**
 * Periodic interval to check elapsed idle time.
 */
const CHECK_INTERVAL_MS = 10000;
/**
 * Local storage key used for cross-tab activity synchronization.
 */
const STORAGE_KEY = 'pratima_erp_last_activity';

export interface IdleTimeoutProviderProps {
  children: React.ReactNode;
  /**
   * Optional custom timeout in milliseconds. Defaults to 30 minutes (1,800,000 ms).
   */
  timeoutMs?: number;
  /**
   * Explicit authentication flag if provided by server layout.
   */
  isAuthenticated?: boolean;
}

export function IdleTimeoutProvider({
  children,
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  isAuthenticated,
}: IdleTimeoutProviderProps) {
  const { status } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleCallRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine authentication status: explicit prop takes precedence, fallback to NextAuth session
  const activeAuth = isAuthenticated ?? (status === 'authenticated');

  // Trigger automated logout on inactivity expiration
  const triggerAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('pratima_tenant_splash_seen');
      }

      await signOut({
        callbackUrl: '/login?reason=timeout',
        redirect: true,
      });
    } catch (error) {
      console.error('[IdleTimeoutProvider] Error during automated sign-out:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=timeout';
      }
    }
  }, []);

  // Update activity timestamp with high-performance throttling
  const recordActivity = useCallback(() => {
    const now = Date.now();

    // Skip if throttled within window
    if (now - lastThrottleCallRef.current < THROTTLE_INTERVAL_MS) {
      return;
    }

    lastThrottleCallRef.current = now;
    lastActivityRef.current = now;

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    } catch {
      // LocalStorage unavailable or in private mode; memory tracking persists
    }
  }, []);

  useEffect(() => {
    // Only track activity for authenticated sessions
    if (!activeAuth) {
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastThrottleCallRef.current = now;

    // Check cross-tab stored activity on initialization
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            const elapsed = now - parsed;
            if (elapsed >= timeoutMs) {
              // Expired while away
              triggerAutoLogout();
              return;
            }
            lastActivityRef.current = parsed;
          }
        }
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    } catch {
      // Storage access ignored
    }

    // High-performance event listener list
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'wheel',
      'touchstart',
      'scroll',
    ];

    const handleActivity = () => {
      recordActivity();
    };

    // Attach passive listeners for maximum performance
    activityEvents.forEach((eventType) => {
      window.addEventListener(eventType, handleActivity, { passive: true, capture: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const parsedTime = parseInt(event.newValue, 10);
        if (!isNaN(parsedTime)) {
          lastActivityRef.current = Math.max(lastActivityRef.current, parsedTime);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Immediate check when returning to tab/waking from sleep
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentTime = Date.now();
        let effectiveLastActivity = lastActivityRef.current;

        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed)) {
              effectiveLastActivity = Math.max(effectiveLastActivity, parsed);
              lastActivityRef.current = effectiveLastActivity;
            }
          }
        } catch {
          // Ignore
        }

        if (currentTime - effectiveLastActivity >= timeoutMs) {
          triggerAutoLogout();
        } else {
          recordActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic heartbeat verification
    checkTimerRef.current = setInterval(() => {
      const currentTime = Date.now();
      let effectiveLastActivity = lastActivityRef.current;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            effectiveLastActivity = Math.max(effectiveLastActivity, parsed);
            lastActivityRef.current = effectiveLastActivity;
          }
        }
      } catch {
        // Ignore
      }

      if (currentTime - effectiveLastActivity >= timeoutMs) {
        triggerAutoLogout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      // Clean up event listeners and timers on unmount
      activityEvents.forEach((eventType) => {
        window.removeEventListener(eventType, handleActivity, { capture: true });
      });
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [activeAuth, timeoutMs, recordActivity, triggerAutoLogout]);

  return <>{children}</>;
}
