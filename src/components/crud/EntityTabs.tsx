'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export interface EntityTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface EntityTabsProps {
  tabs: EntityTab[];
  defaultValue?: string;
  className?: string;
}

export function EntityTabs({ tabs, defaultValue, className }: EntityTabsProps) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <TabsPrimitive.Root defaultValue={defaultValue || tabs[0].id} className={cn("flex flex-col", className)}>
      <TabsPrimitive.List className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max">
        {tabs.map(tab => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map(tab => (
        <TabsPrimitive.Content
          key={tab.id}
          value={tab.id}
          className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
