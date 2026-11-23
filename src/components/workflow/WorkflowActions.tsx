import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/buttons/Button';
import type { WorkflowTransition } from './types';

interface WorkflowActionsProps {
  transitions: WorkflowTransition[];
  onTransition: (transition: WorkflowTransition) => void;
  isProcessing?: boolean;
  className?: string;
}

export function WorkflowActions({ transitions, onTransition, isProcessing, className }: WorkflowActionsProps) {
  if (!transitions || transitions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {transitions.map((t) => (
        <Button
          key={t.id}
          variant={t.variant || 'outline'}
          size="sm"
          onClick={() => onTransition(t)}
          disabled={isProcessing}
        >
          {t.icon && <span className="mr-2">{t.icon}</span>}
          {t.label}
        </Button>
      ))}
    </div>
  );
}
