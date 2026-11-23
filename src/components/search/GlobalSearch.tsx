import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search as SearchIcon } from 'lucide-react';

interface GlobalSearchProps {
  onOpenPalette: () => void;
  shortcut?: string;
  className?: string;
}

export function GlobalSearch({ onOpenPalette, shortcut = "⌘K", className }: GlobalSearchProps) {
  return (
    <button
      type="button"
      onClick={onOpenPalette}
      className={cn(
        "flex items-center gap-2 w-full max-w-sm rounded-md border border-input bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors shadow-sm",
        className
      )}
    >
      <SearchIcon className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        {shortcut}
      </kbd>
    </button>
  );
}
