'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';
import type { ActionDefinition } from './types';

interface ActionDropdownProps {
  actions: ActionDefinition[];
  trigger?: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function ActionDropdown({ actions, trigger, className, align = 'end' }: ActionDropdownProps) {
  const visibleActions = actions.filter(a => !a.hidden);
  if (visibleActions.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger || (
          <div className={className}>
            <IconButton aria-label="More actions" variant="ghost" size="sm" icon={<MoreHorizontal className="h-4 w-4" />} />
          </div>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {visibleActions.map((action) => (
            <DropdownMenu.Item
              key={action.id}
              disabled={action.disabled}
              onSelect={(e) => {
                // Keep dropdown open if action requires confirmation or handles it internally?
                // For now, default Radix behavior is to close on select.
                action.onClick();
              }}
              className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                action.variant === 'danger' && "text-destructive focus:bg-destructive/10 focus:text-destructive"
              )}
            >
              {action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>}
              <span>{action.label}</span>
              {action.shortcut && (
                <span className="ml-auto text-xs tracking-widest opacity-60">
                  {action.shortcut.join(' ')}
                </span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
