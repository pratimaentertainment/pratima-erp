import * as React from 'react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/cards';
import { Button } from '@/components/buttons/Button';
import type { EntityDetailAction } from './types';

interface EntityQuickActionsProps {
  actions: EntityDetailAction[];
  title?: string;
  className?: string;
}

export function EntityQuickActions({ actions, title = "Quick Actions", className }: EntityQuickActionsProps) {
  const visibleActions = actions?.filter(a => !a.hidden) || [];
  
  if (visibleActions.length === 0) return null;

  return (
    <ContentCard className={cn("w-full", className)}>
      <div className="mb-4 pb-2 border-b text-sm font-medium">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {visibleActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            className="w-full justify-start"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </ContentCard>
  );
}
