'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { EntityDetailTab } from './types';

interface EntityTabsProps {
  tabs: EntityDetailTab[];
  defaultTab?: string;
  className?: string;
}

export function EntityTabs({ tabs, defaultTab, className }: EntityTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex overflow-x-auto border-b border-border/50 mb-6 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="w-full">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
