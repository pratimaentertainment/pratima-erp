'use client';

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';

/**
 * Default inactivity timeout: strictly 30 minutes (1,800,000 ms)
 */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Throttling threshold: activity resets execute at most once every 2 seconds (2,000 ms)
 * to eliminate performance overhead and avoid resetting timers on high-frequency mouse movements.
 */
const DEFAULT_THROTTLE_MS = 2000;

/**
 * DOM interaction events monitored for user activity.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
];

/**
 * Key used to synchronize user activity across multiple browser tabs.
 */
const STORAGE_SYNC_KEY = 'pratima_last_activity_sync';

export interface AutoLogoutProviderProps {
  children: React.ReactNode;
  /**
   * Inactivity timeout duration in milliseconds. Defaults to 30 minutes.
   */
  timeoutMs?: number;
  /**
   * Activity throttle threshold in milliseconds. Defaults to 2,000 ms (2 seconds).
   */
  throttleMs?: number;
}

export function AutoLogoutProvider({
  children,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  throttleMs = DEFAULT_THROTTLE_MS,
}: AutoLogoutProviderProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimeRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  /**
   * Executes automated sign-out upon session timeout expiration.
   */
  const handleTimeout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_SYNC_KEY);
        sessionStorage.removeItem('pratima_splash_seen');
        sessionStorage.removeItem('pratima_tenant_splash_seen');
        sessionStorage.removeItem('pratima_superadmin_splash_seen');
      }

      await signOut({
        callbackUrl: '/login?error=InactivityTimeout',
        redirect: true,
      });
    } catch (error) {
      console.error('[AutoLogoutProvider] Sign-out redirect fallback:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=InactivityTimeout';
      }
    }
  }, []);

  useEffect(() => {
    // Initial timer arming
    lastActionTimeRef.current = Date.now();
    timerRef.current = setTimeout(handleTimeout, timeoutMs);

    /**
     * Throttled activity listener to reset the inactivity timer.
     */
    const handleActivity = () => {
      const now = Date.now();

      // Enforce throttling: ignore high-frequency events within throttle window
      if (now - lastActionTimeRef.current < throttleMs) {
        return;
      }

      lastActionTimeRef.current = now;

      // Broadcast activity to sibling tabs
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_SYNC_KEY, String(now));
        }
      } catch {
        // Fallback silently if localStorage is restricted
      }

      // Reset timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleTimeout, timeoutMs);
    };

    /**
     * Cross-tab activity synchronization listener
     */
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_SYNC_KEY && event.newValue) {
        const remoteTimestamp = Number(event.newValue);
        if (!isNaN(remoteTimestamp)) {
          lastActionTimeRef.current = remoteTimestamp;
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(handleTimeout, timeoutMs);
        }
      }
    };

    // Attach passive listeners for optimal UI thread scrolling and rendering performance
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    window.addEventListener('storage', handleStorage);

    // Guaranteed cleanup on unmount to prevent memory leaks
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [handleTimeout, timeoutMs, throttleMs]);

  return <>{children}</>;
}
