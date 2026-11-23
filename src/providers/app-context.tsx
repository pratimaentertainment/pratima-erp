'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ActiveContextUser, ActiveContextBranch, ActiveContextTenant } from '@/lib/context';
import { switchBranchAction } from '@/actions/context.actions';
import { toast } from 'sonner';

export interface AppContextValue {
  currentTenant: ActiveContextTenant | null;
  currentBranch: ActiveContextBranch | null;
  currentUser: ActiveContextUser | null;
  branches: ActiveContextBranch[];
  isOwnerOrAdmin: boolean;
  switchBranch: (branchId: string) => Promise<void>;
  isSwitchingBranch: boolean;
  isLoading: boolean;
  isHydrated: boolean;
}

export const AppContext = React.createContext<AppContextValue | undefined>(undefined);

export function AppContextProvider({
  initialContext,
  children,
}: {
  initialContext: {
    user: ActiveContextUser | null;
    tenant: ActiveContextTenant | null;
    activeBranch: ActiveContextBranch | null;
    branches: ActiveContextBranch[];
    isOwnerOrAdmin: boolean;
  };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [currentBranch, setCurrentBranch] = React.useState<ActiveContextBranch | null>(
    initialContext.activeBranch
  );
  const [isSwitchingBranch, setIsSwitchingBranch] = React.useState(false);

  React.useEffect(() => {
    setCurrentBranch(initialContext.activeBranch);
  }, [initialContext.activeBranch]);

  const switchBranch = React.useCallback(
    async (branchId: string) => {
      if (!initialContext.isOwnerOrAdmin) {
        toast.error('Permission denied: Only Tenant Owners or Administrators can switch branches.');
        return;
      }

      setIsSwitchingBranch(true);
      try {
        const res = await switchBranchAction(branchId);
        if (res.success) {
          if (branchId === 'ALL') {
            setCurrentBranch({
              id: 'ALL',
              name: 'All Branches (Consolidated)',
              code: 'ALL',
              isHeadOffice: false,
              isActive: true,
            });
          } else {
            const newBranch = initialContext.branches.find((b) => b.id === branchId);
            if (newBranch) {
              setCurrentBranch(newBranch);
            }
          }
          toast.success(`Switched active branch to "${res.branchName || 'selected branch'}"`);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to switch branch');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error occurred while switching branch');
      } finally {
        setIsSwitchingBranch(false);
      }
    },
    [initialContext.isOwnerOrAdmin, initialContext.branches, router]
  );

  const value: AppContextValue = {
    currentTenant: initialContext.tenant,
    currentBranch,
    currentUser: initialContext.user,
    branches: initialContext.branches,
    isOwnerOrAdmin: initialContext.isOwnerOrAdmin,
    switchBranch,
    isSwitchingBranch,
    isHydrated,
    isLoading: !isHydrated,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = React.useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return ctx;
}

export function useOptionalAppContext() {
  return React.useContext(AppContext) ?? null;
}
