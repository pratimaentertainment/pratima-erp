'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Shield, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useAppContext } from '@/providers/app-context';
import { Badge } from '@/components/ui/badge';

export function UserMenu() {
  const { currentUser } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pratima_splash_seen');
        sessionStorage.removeItem('pratima_tenant_splash_seen');
        sessionStorage.removeItem('pratima_superadmin_splash_seen');
      }
      await signOut({ callbackUrl: '/login' });
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    }
  };

  const userName = currentUser?.name || 'Studio Staff';
  const userEmail = currentUser?.email || 'staff@pratimaerp.com';
  const userRole = currentUser?.role || 'STAFF';

  // Get initials for avatar
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 font-bold text-xs transition-colors cursor-pointer border border-primary/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`${userName} (${userRole})`}
      >
        <span>{initials}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
          {/* User Info Header */}
          <div className="px-3.5 py-2.5 border-b border-border/70 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-xs font-bold text-foreground truncate">{userName}</p>
              <Badge
                variant="outline"
                className="text-[9px] uppercase px-1.5 py-0 font-mono tracking-wider bg-primary/10 text-primary border-primary/20"
              >
                {userRole.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/profile"
              className="flex items-center px-3.5 py-2 text-xs text-foreground hover:bg-muted transition-colors w-full"
              onClick={() => setIsOpen(false)}
            >
              <User size={14} className="mr-2.5 text-muted-foreground" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center px-3.5 py-2 text-xs text-foreground hover:bg-muted transition-colors w-full"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={14} className="mr-2.5 text-muted-foreground" />
              <span>Studio Settings</span>
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-border/70 pt-1 mt-1">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="flex items-center px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors w-full text-left font-medium cursor-pointer"
            >
              <LogOut size={14} className="mr-2.5 text-rose-500" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
