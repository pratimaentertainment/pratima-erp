'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';

interface TenantContextValue {
  tenantId: string | null;
  setTenantId?: (id: string) => void;
}

const TenantContext = React.createContext<TenantContextValue>({ tenantId: null });

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenantId || null;

  return (
    <TenantContext.Provider value={{ tenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return React.useContext(TenantContext);
}
