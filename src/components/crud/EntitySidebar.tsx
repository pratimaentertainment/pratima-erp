import * as React from 'react';

export interface EntitySidebarProps {
  children: React.ReactNode;
}

export function EntitySidebar({ children }: EntitySidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      {children}
    </div>
  );
}
