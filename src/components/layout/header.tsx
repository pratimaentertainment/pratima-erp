'use client';

import * as React from 'react';
import { useState } from 'react';
import { ThemeSwitch } from './ThemeSwitch';
import { UserMenu } from './UserMenu';
import { Breadcrumbs } from './Breadcrumbs';
import { BranchSwitcher, TenantDisplay } from './Switchers';
import { CommandPalette } from './CommandPalette';
import { StorefrontQrModal } from './storefront-qr-modal';
import { Search } from 'lucide-react';

interface HeaderProps {
  context?: any;
}

export function Header({ context }: HeaderProps = {}) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 z-10 shrink-0 gap-3 print:hidden">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Static Tenant Display (Security Isolation - Non-switchable) */}
          <TenantDisplay />

          {/* RBAC-Controlled Branch Switcher */}
          <BranchSwitcher />

          {/* Public Storefront Link & Desk QR Utility */}
          <StorefrontQrModal />

          {/* Global Omnibar Search Trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-md border border-border/60 transition-colors cursor-pointer"
            title="Search clients, leads, bookings (⌘K)"
          >
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <span className="hidden sm:inline-block">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>

          {/* Theme Switch */}
          <ThemeSwitch />

          {/* User Profile Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Global Command Palette Search Modal */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
