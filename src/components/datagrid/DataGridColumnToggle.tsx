'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import { Settings } from 'lucide-react';
import { Button } from '@/components/buttons/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SharedPortal } from '@/components/layout/Portal';

interface DataGridColumnToggleProps<TData> {
  table: Table<TData>;
}

export function DataGridColumnToggle<TData>({ table }: DataGridColumnToggleProps<TData>) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenu.Trigger>
      <SharedPortal>
        <DropdownMenu.Content align="end" className="w-[150px] z-[var(--z-dropdown)] bg-popover text-popover-foreground rounded-md border shadow-md p-1">
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold">Toggle columns</DropdownMenu.Label>
          <DropdownMenu.Separator className="h-px bg-border my-1" />
          {table
            .getAllColumns()
            .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
            .map((column) => {
              return (
                <DropdownMenu.CheckboxItem
                  key={column.id}
                  className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <DropdownMenu.ItemIndicator>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </DropdownMenu.ItemIndicator>
                  </span>
                  {column.id}
                </DropdownMenu.CheckboxItem>
              );
            })}
        </DropdownMenu.Content>
      </SharedPortal>
    </DropdownMenu.Root>
  );
}
