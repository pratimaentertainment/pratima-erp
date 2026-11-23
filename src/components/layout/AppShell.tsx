'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AppContextProvider, useOptionalAppContext } from '@/providers/app-context';
import { ActiveContextUser, ActiveContextBranch, ActiveContextTenant } from '@/lib/context';

interface AppShellProps {
  initialContext?: {
    user: ActiveContextUser | null;
    tenant: ActiveContextTenant | null;
    activeBranch: ActiveContextBranch | null;
    branches: ActiveContextBranch[];
    isOwnerOrAdmin: boolean;
  };
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ initialContext, banner, children }: AppShellProps) {
  const existingContext = useOptionalAppContext();

  const content = (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Header />
        {banner}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );

  // If already wrapped in AppContextProvider from layout, render content directly
  if (existingContext) {
    return content;
  }

  const defaultContext = initialContext || {
    user: null,
    tenant: null,
    activeBranch: null,
    branches: [],
    isOwnerOrAdmin: false,
  };

  return (
    <AppContextProvider initialContext={defaultContext}>
      {content}
    </AppContextProvider>
  );
}
