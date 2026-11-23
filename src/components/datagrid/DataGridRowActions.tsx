'use client';

import * as React from 'react';
import { type Row } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/buttons/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SharedPortal } from '@/components/layout/Portal';
import type { DataGridAction } from './types';
import { cn } from '@/lib/utils';

interface DataGridRowActionsProps<TData> {
  row: Row<TData>;
  actions: DataGridAction<TData>[];
}

export function DataGridRowActions<TData>({ row, actions }: DataGridRowActionsProps<TData>) {
  const visibleActions = actions.filter(action => (action.show ? action.show(row.original) : true));
  
  if (visibleActions.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenu.Trigger>
      <SharedPortal>
        <DropdownMenu.Content align="end" className="w-[160px] z-[var(--z-dropdown)] bg-popover text-popover-foreground rounded-md border shadow-md p-1">
          {visibleActions.map((action, index) => (
            <React.Fragment key={action.id}>
              {index > 0 && action.isDestructive && !visibleActions[index - 1].isDestructive && (
                <DropdownMenu.Separator className="h-px bg-border my-1" />
              )}
              <DropdownMenu.Item
                onClick={() => action.onClick(row.original)}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  action.isDestructive && "text-destructive focus:text-destructive focus:bg-destructive/10"
                )}
              >
                {action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>}
                {action.label}
              </DropdownMenu.Item>
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </SharedPortal>
    </DropdownMenu.Root>
  );
}
