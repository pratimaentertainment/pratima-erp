'use client';

import * as React from 'react';

interface PermissionContextValue {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
}

const PermissionContext = React.createContext<PermissionContextValue>({ 
  permissions: [],
  hasPermission: () => false,
});

export function PermissionProvider({ 
  children, 
  initialPermissions = [] 
}: { 
  children: React.ReactNode, 
  initialPermissions?: string[] 
}) {
  const hasPermission = React.useCallback((permission: string) => {
    return initialPermissions.includes(permission);
  }, [initialPermissions]);

  return (
    <PermissionContext.Provider value={{ permissions: initialPermissions, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return React.useContext(PermissionContext);
}
