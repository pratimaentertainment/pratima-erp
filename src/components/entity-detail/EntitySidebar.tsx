import * as React from 'react';
import { cn } from '@/lib/utils';

interface EntitySidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function EntitySidebar({ children, className }: EntitySidebarProps) {
  return (
    <aside className={cn("w-full lg:w-80 flex flex-col gap-6 shrink-0", className)}>
      {children}
    </aside>
  );
}
