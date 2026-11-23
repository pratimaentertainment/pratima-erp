import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/buttons/Button';
import type { StateTransition } from './types';

interface StateTransitionMenuProps {
  transitions: StateTransition[];
  className?: string;
}

export function StateTransitionMenu({ transitions, className }: StateTransitionMenuProps) {
  if (!transitions || transitions.length === 0) return null;

  const mapVariant = (v?: string) => {
    if (v === 'danger') return 'destructive';
    if (!v) return 'outline';
    return v as any;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {transitions.map((t) => (
        <Button
          key={t.id}
          variant={mapVariant(t.variant)}
          size="sm"
          onClick={t.onTransition}
        >
          {t.icon && <span className="mr-2 h-4 w-4">{t.icon}</span>}
          {t.label}
        </Button>
      ))}
    </div>
  );
}
