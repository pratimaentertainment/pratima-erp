'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';

interface BranchContextValue {
  activeBranchId: string | null;
}

const BranchContext = React.createContext<BranchContextValue>({ activeBranchId: null });

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const activeBranchId = (session?.user as any)?.activeBranchId || null;

  return (
    <BranchContext.Provider value={{ activeBranchId }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return React.useContext(BranchContext);
}
