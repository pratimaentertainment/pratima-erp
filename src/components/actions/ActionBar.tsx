import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/buttons/Button';
import type { ActionDefinition, ActionGroupDefinition } from './types';

interface ActionBarProps {
  primaryActions?: ActionDefinition[];
  secondaryActions?: ActionDefinition[];
  groups?: ActionGroupDefinition[];
  className?: string;
}

export function ActionBar({ primaryActions = [], secondaryActions = [], className }: ActionBarProps) {
  const mapVariant = (v?: string) => {
    if (v === 'danger') return 'destructive';
    if (!v) return 'secondary';
    return v as any;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {secondaryActions.filter(a => !a.hidden).map((action) => (
        <Button
          key={action.id}
          variant={mapVariant(action.variant) || 'outline'}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>}
          {action.label}
        </Button>
      ))}

      {primaryActions.filter(a => !a.hidden).map((action) => (
        <Button
          key={action.id}
          variant={mapVariant(action.variant) || 'primary'}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
