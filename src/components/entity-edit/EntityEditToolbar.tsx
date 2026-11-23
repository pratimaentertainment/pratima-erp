import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/buttons/Button';
import type { EntityEditAction } from './types';

interface EntityEditToolbarProps {
  primaryAction?: React.ReactNode | EntityEditAction;
  secondaryActions?: Array<React.ReactNode | EntityEditAction>;
  className?: string;
}

export function EntityEditToolbar({ primaryAction, secondaryActions, className }: EntityEditToolbarProps) {
  const renderAction = (action: React.ReactNode | EntityEditAction, isPrimary = false) => {
    if (React.isValidElement(action)) return action;
    
    const config = action as EntityEditAction;
    if (config.hidden) return null;

    return (
      <Button
        key={config.id}
        variant={config.variant || (isPrimary ? 'primary' : 'outline')}
        type={config.type || 'button'}
        onClick={config.onClick}
        disabled={config.disabled}
      >
        {config.icon && <span className="mr-2">{config.icon}</span>}
        {config.label}
      </Button>
    );
  };

  return (
    <div className={cn("flex items-center justify-end gap-3 pt-6 border-t mt-8", className)}>
      {secondaryActions && secondaryActions.length > 0 && (
        <div className="flex items-center gap-2">
          {secondaryActions.map((action, idx) => (
            <React.Fragment key={idx}>{renderAction(action)}</React.Fragment>
          ))}
        </div>
      )}
      
      {primaryAction && renderAction(primaryAction, true)}
    </div>
  );
}
