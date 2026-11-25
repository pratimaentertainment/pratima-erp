'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles } from 'lucide-react';
import { ActiveContextTenant } from '@/lib/context';
import { useOptionalAppContext } from '@/providers/app-context';

export interface TenantSplashScreenProps {
  tenant?: ActiveContextTenant | null;
  children?: React.ReactNode;
}

const PRIMARY_STORAGE_KEY = 'pratima_splash_seen';
const LEGACY_STORAGE_KEY = 'pratima_tenant_splash_seen';

// Isomorphic layout effect executes synchronously before browser paint on client
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function TenantSplashScreen({ tenant: propTenant, children }: TenantSplashScreenProps) {
  const context = useOptionalAppContext();
  const tenant = propTenant || context?.currentTenant;

  // Initialize isVisible to true synchronously to eliminate initial paint FOUC
  const [isVisible, setIsVisible] = useState(true);

  // Validate custom logoUrl existence
  const logoUrl = useMemo(() => {
    const rawLogo = tenant?.logoUrl;
    if (!rawLogo || typeof rawLogo !== 'string' || rawLogo.trim() === '') {
      return null;
    }
    return rawLogo.trim();
  }, [tenant?.logoUrl]);

  const tenantName = useMemo(() => {
    return tenant?.tradeName || tenant?.name || 'FRAMIQ Studio';
  }, [tenant]);

  // Synchronously evaluate sessionStorage before paint on the client
  useIsomorphicLayoutEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const seen =
          sessionStorage.getItem(PRIMARY_STORAGE_KEY) ||
          sessionStorage.getItem(LEGACY_STORAGE_KEY);

        if (seen === 'true') {
          setIsVisible(false);
        }
      }
    } catch {
      setIsVisible(false);
    }
  }, []);

  // Dismiss handler: closes splash and commits session bypass flags
  const handleDismiss = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PRIMARY_STORAGE_KEY, 'true');
        sessionStorage.setItem(LEGACY_STORAGE_KEY, 'true');
      }
    } catch {
      // Storage access issues ignored
    }
    setIsVisible(false);
  }, []);

  // Interactive Dismissal: Listen for user interaction (click, keypress, or touch)
  useEffect(() => {
    if (!isVisible) return;

    const onInteraction = () => {
      handleDismiss();
    };

    const options: AddEventListenerOptions = { passive: true };

    window.addEventListener('mousedown', onInteraction, options);
    window.addEventListener('keydown', onInteraction, options);
    window.addEventListener('touchstart', onInteraction, options);

    return () => {
      window.removeEventListener('mousedown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
    };
  }, [isVisible, handleDismiss]);

  return (
    <>
      {/* Background children mount and fetch data silently during splash display */}
      {children}

      {/* Full-Screen Luxury Splash Overlay with absolute opacity during initial paint */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="pratima-splash-overlay"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={handleDismiss}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background select-none cursor-pointer"
            style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
            aria-live="polite"
            aria-busy={isVisible}
          >
            {/* Luxury Ambient Radial Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center pointer-events-none">
              {/* Brand Logo with continuous subtle breathing / pulsing animation */}
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 12 }}
                animate={{
                  scale: [1, 1.04, 1],
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  scale: {
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  opacity: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                  y: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                }}
                className="relative flex items-center justify-center"
              >
                {/* Subtle pulsing rim glow */}
                <div className="absolute -inset-4 bg-primary/25 rounded-3xl blur-2xl opacity-75 animate-pulse pointer-events-none" />

                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl p-2.5 bg-card/90 border border-border/80 shadow-2xl flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={tenantName}
                      className="max-h-full max-w-full object-contain drop-shadow-xs"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-primary">
                      <div className="relative">
                        <Camera className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.75]" />
                        <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Studio Brand Name & Typography */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 space-y-1"
              >
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                  {tenantName}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground tracking-widest uppercase">
                  Studio Management System
                </p>
              </motion.div>

              {/* Elegant Shimmer Accent Divider */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 140, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.2, ease: 'easeInOut' }}
                className="mt-6 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
              />

              {/* Subtle Workspace Status Notice */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mt-3 text-[11px] text-muted-foreground/80 font-mono tracking-wide"
              >
                Workspace ready
              </motion.p>
            </div>

            {/* Bottom Interactive Dismissal Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: [0.45, 1, 0.45],
                y: 0,
              }}
              transition={{
                opacity: {
                  delay: 0.5,
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
                y: { delay: 0.5, duration: 0.4, ease: 'easeOut' },
              }}
              className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/50 bg-card/70 backdrop-blur-md shadow-lg pointer-events-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[11px] sm:text-[12px] font-medium tracking-wider text-muted-foreground/90 uppercase select-none">
                Click anywhere to enter studio
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export const SplashScreen = TenantSplashScreen;
