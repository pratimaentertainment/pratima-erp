import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardLayoutConfig } from './types';

interface DashboardLayoutProps {
  config?: DashboardLayoutConfig;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ config, header, sidebar, children, className }: DashboardLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-screen bg-gray-50/50", className)}>
      {header && <div className="sticky top-0 z-40 bg-background border-b shadow-sm">{header}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <aside className="w-64 border-r bg-background shrink-0 overflow-y-auto">{sidebar}</aside>}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
