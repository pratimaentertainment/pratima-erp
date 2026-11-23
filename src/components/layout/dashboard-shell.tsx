'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ImpersonationBanner } from './impersonation-banner';
import { BroadcastBanner, BroadcastData } from './broadcast-banner';

interface DashboardShellProps {
  children: React.ReactNode;
  context: any;
  broadcast?: BroadcastData | null;
}

export function DashboardShell({ children, context, broadcast }: DashboardShellProps) {
  const impersonation = context?.impersonation;

  return (
    <div className="flex flex-col h-screen bg-background print:h-auto print:overflow-visible">
      {impersonation && <ImpersonationBanner impersonation={impersonation} />}
      {broadcast && <BroadcastBanner broadcast={broadcast} />}
      <div className="flex flex-1 overflow-hidden print:h-auto print:overflow-visible">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
          <Header context={context} />
          <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">{children}</main>
        </div>
      </div>
    </div>
  );
}
