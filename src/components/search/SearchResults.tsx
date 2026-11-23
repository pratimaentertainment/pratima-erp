import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SearchGroupConfig, SearchResultItemConfig } from './types';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
  groups: SearchGroupConfig[];
  activeIndex?: number;
  onItemClick?: (item: SearchResultItemConfig) => void;
  className?: string;
}

export function SearchResults({ groups, activeIndex = -1, onItemClick, className }: SearchResultsProps) {
  let globalIndex = 0;

  return (
    <div className={cn("flex flex-col w-full overflow-y-auto max-h-[60vh] py-2", className)} role="listbox">
      {groups.map((group) => (
        <div key={group.id} className="mb-4 last:mb-0 px-2">
          <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map(item => {
              const currentActive = globalIndex === activeIndex;
              globalIndex++;
              return (
                <SearchResultItem 
                  key={item.id} 
                  item={item} 
                  active={currentActive} 
                  onClick={onItemClick} 
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
