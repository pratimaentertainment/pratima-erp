import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import type { SearchGroupConfig, SearchResultItemConfig } from './types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: SearchGroupConfig[];
  onSearch: (query: string) => void;
  onItemSelect: (item: SearchResultItemConfig) => void;
  isLoading?: boolean;
  className?: string;
}

export function CommandPalette({ open, onOpenChange, groups, onSearch, onItemSelect, isLoading, className }: CommandPaletteProps) {
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      let currentIndex = 0;
      for (const group of groups) {
        for (const item of group.items) {
          if (currentIndex === activeIndex) {
            onItemSelect(item);
            onOpenChange(false);
            return;
          }
          currentIndex++;
        }
      }
    }
  };

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(-1);
  }, [groups]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content 
          className={cn(
            "fixed left-[50%] top-[20%] z-50 w-full max-w-2xl translate-x-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl overflow-hidden flex flex-col",
            className
          )}
          onKeyDown={handleKeyDown}
        >
          <div className="border-b">
            <SearchInput 
              autoFocus
              className="border-0 shadow-none focus-visible:ring-0 rounded-none h-14 text-base"
              placeholder="Search everything... (Try 'quo', 'inv', 'settings')"
              onChange={(e) => onSearch(e.target.value)}
              isLoading={isLoading}
            />
          </div>
          
          <div className="bg-muted/10 p-2">
            {groups.length > 0 ? (
              <SearchResults 
                groups={groups} 
                activeIndex={activeIndex} 
                onItemClick={(item) => {
                  onItemSelect(item);
                  onOpenChange(false);
                }} 
              />
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </div>
          
          <div className="bg-muted px-4 py-2 text-[10px] text-muted-foreground flex justify-between border-t border-border/50">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>ESC to close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
