import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/buttons/Button';
import type { EntityDetailAction } from './types';

interface EntityHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: EntityDetailAction[];
  className?: string;
}

export function EntityHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className,
}: EntityHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="flex flex-col gap-1">
        {breadcrumbs && <div className="text-sm text-muted-foreground mb-1">{breadcrumbs}</div>}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      </div>
      
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions.filter(a => !a.hidden).map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
