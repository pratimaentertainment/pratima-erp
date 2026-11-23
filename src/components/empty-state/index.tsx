'use client';

import * as React from 'react';
import { PackageOpen, ShieldAlert, AlertTriangle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh] border border-dashed border-border rounded-lg bg-background/50">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        {icon || <PackageOpen size={24} />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <EmptyState
      title="Access Denied"
      description="You do not have permission to view this page or perform this action."
      icon={<ShieldAlert size={24} className="text-danger" />}
    />
  );
}

export function ErrorState({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={error || "An unexpected error occurred while loading the data."}
      icon={<AlertTriangle size={24} className="text-danger" />}
      action={retry ? (
        <button 
          onClick={retry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      ) : null}
    />
  );
}
