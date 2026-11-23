'use client';

import * as React from 'react';
import { Button } from '@/components/buttons/Button';
import { ContentCard } from '@/components/cards';

export interface EntityQuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
}

export interface EntityQuickActionsProps {
  actions: EntityQuickAction[];
}

export function EntityQuickActions({ actions }: EntityQuickActionsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <ContentCard title="Quick Actions">
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            className="w-full justify-start"
          >
            {action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </ContentCard>
  );
}
