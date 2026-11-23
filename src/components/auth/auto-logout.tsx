'use client';

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

/**
 * Key used to synchronize user activity across multiple browser tabs.
 */
const STORAGE_SYNC_KEY = 'pratima_last_activity_sync';

/**
 * Throttle threshold: activity updates execute at most once every 2 seconds (2,000 ms)
 * to avoid CPU overhead on high-frequency mouse movements and scrolling.
 */
const DEFAULT_THROTTLE_MS = 2000;

/**
 * Periodic tick interval to check if elapsed idle time has exceeded the timeout.
 * Crucial for detecting inactivity even after device sleep/tab hibernation.
 */
const CHECK_INTERVAL_MS = 5000;

/**
 * DOM interaction events monitored for user activity.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];

export interface AutoLogoutProps {
  /**
   * Inactivity timeout duration in minutes. Defaults to 30 minutes.
   */
  timeoutMinutes?: number;
}

/**
 * Enterprise Inactivity Auto-Logout Component.
 * Monitors user interaction across browser tabs and forcefully terminates
 * session if no activity is detected for the specified timeout duration.
 */
export function AutoLogout({ timeoutMinutes = 30 }: AutoLogoutProps) {
  const pathname = usePathname();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const lastActionTimeRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);
  const throttleTimerRef = useRef<number>(Date.now());

  // Determine if the current route is an unauthenticated public auth route
  const isPublicAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password');

  /**
   * Executes automated sign-out and session destruction upon inactivity timeout.
   */
  const handleInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_SYNC_KEY);
        sessionStorage.removeItem('pratima_splash_seen');
        sessionStorage.removeItem('pratima_tenant_splash_seen');
        sessionStorage.removeItem('pratima_superadmin_splash_seen');
      }

      // Destroy session on the authentication server
      await signOut({
        redirect: false,
      });
    } catch (error) {
      console.error('[AutoLogout] Error during automated sign-out:', error);
    } finally {
      // Forcefully redirect to login with InactivityTimeout error code
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=InactivityTimeout';
      }
    }
  }, []);

  useEffect(() => {
    // Do not track inactivity on public authentication pages
    if (isPublicAuthRoute) {
      return;
    }

    lastActionTimeRef.current = Date.now();
    isLoggingOutRef.current = false;

    /**
     * Throttled user activity handler to update last activity timestamp.
     */
    const handleActivity = () => {
      const now = Date.now();

      // Enforce throttling to prevent excessive writes
      if (now - throttleTimerRef.current < DEFAULT_THROTTLE_MS) {
        return;
      }

      throttleTimerRef.current = now;
      lastActionTimeRef.current = now;

      // Broadcast activity to sibling tabs via localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_SYNC_KEY, String(now));
        }
      } catch {
        // Fallback silently if localStorage is restricted
      }
    };

    /**
     * Cross-tab synchronization listener
     */
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === STORAGE_SYNC_KEY && event.newValue) {
        const remoteTimestamp = Number(event.newValue);
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastActionTimeRef.current) {
          lastActionTimeRef.current = remoteTimestamp;
        }
      }
    };

    /**
     * Periodic interval checker for inactivity expiration.
     */
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActionTimeRef.current;

      if (elapsed >= timeoutMs) {
        clearInterval(intervalId);
        handleInactivityLogout();
      }
    }, CHECK_INTERVAL_MS);

    // Attach passive listeners for maximum scrolling and rendering performance
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    window.addEventListener('storage', handleStorageSync);

    // Clean up all timers and listeners on unmount
    return () => {
      clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [handleInactivityLogout, isPublicAuthRoute, timeoutMs]);

  return null;
}
