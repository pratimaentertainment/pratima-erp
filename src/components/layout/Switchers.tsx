'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Building, Building2, ChevronDown, Check, Loader2, GitBranch } from 'lucide-react';
import { useAppContext } from '@/providers/app-context';
import { Badge } from '@/components/ui/badge';

/**
 * TenantDisplay (SECURITY FIX):
 * Renders a static, read-only display of the active Tenant.
 * Tenant switching is strictly prohibited and removed for non-super-admin portals.
 */
export function TenantDisplay() {
  const { currentTenant } = useAppContext();
  const displayName =
    currentTenant?.tradeName || currentTenant?.name || 'Pratima Entertainment';

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/60 text-xs font-semibold text-foreground select-none"
      title={`Active Studio: ${displayName}`}
    >
      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate max-w-[140px] lg:max-w-[200px]">{displayName}</span>
    </div>
  );
}

// Backward-compatible alias
export const TenantSwitcher = TenantDisplay;

/**
 * BranchSwitcher (RBAC LOGIC):
 * - If currentUser.role === 'TENANT_OWNER' (or SUPER_ADMIN):
 *   Renders a functional dropdown allowing switching between active branches.
 * - If currentUser.role === 'BRANCH_MANAGER' (or any lower staff role):
 *   Renders a static, read-only badge showing their assigned Branch.
 */
export function BranchSwitcher() {
  const {
    currentBranch,
    branches,
    isOwnerOrAdmin,
    switchBranch,
    isSwitchingBranch,
  } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeBranchName = currentBranch?.name || 'Main Branch';

  // RBAC: If not Tenant Owner or Super Admin, render static read-only badge
  if (!isOwnerOrAdmin) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/50 text-xs font-medium text-foreground select-none"
        title="Assigned Branch (Read-Only)"
      >
        <Building size={14} className="text-muted-foreground shrink-0" />
        <span className="truncate max-w-[130px]">{activeBranchName}</span>
      </div>
    );
  }

  // RBAC: Tenant Owner & Super Admin get interactive Branch Switcher dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingBranch}
        className="flex items-center gap-1.5 text-xs text-foreground bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-md border border-border/60 transition-colors cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch active branch (Owner Privilege)"
      >
        {isSwitchingBranch ? (
          <Loader2 size={14} className="text-primary animate-spin" />
        ) : (
          <GitBranch size={14} className="text-primary" />
        )}
        <span className="font-medium truncate max-w-[130px]">{activeBranchName}</span>
        <ChevronDown size={13} className="text-muted-foreground ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-3 py-1.5 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Active Branch
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {/* Owner Privilege: Consolidated All Branches View */}
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                if (currentBranch?.id !== 'ALL') {
                  await switchBranch('ALL');
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors border-b border-border/50 ${
                currentBranch?.id === 'ALL'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className={currentBranch?.id === 'ALL' ? 'text-primary' : 'text-muted-foreground'} />
                <span className="truncate">All Branches (Consolidated)</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  ALL
                </Badge>
                {currentBranch?.id === 'ALL' && <Check size={14} className="text-primary" />}
              </div>
            </button>

            {branches.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No branches available</div>
            ) : (
              branches.map((branch) => {
                const isSelected = branch.id === currentBranch?.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={async () => {
                      setIsOpen(false);
                      if (!isSelected) {
                        await switchBranch(branch.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building size={14} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="truncate">{branch.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {branch.isHeadOffice && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          HQ
                        </Badge>
                      )}
                      {isSelected && <Check size={14} className="text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
