import * as React from 'react';
import { Search as SearchIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchEmptyState({ query, className }: { query?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-muted-foreground text-center", className)}>
      <SearchIcon className="h-10 w-10 mb-4 opacity-20" />
      <p className="text-sm font-medium text-foreground">No results found</p>
      {query && <p className="text-xs mt-1">We couldn&apos;t find anything matching &quot;{query}&quot;</p>}
    </div>
  );
}

export function SearchLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-muted-foreground text-center", className)}>
      <Loader2 className="h-8 w-8 animate-spin mb-4 opacity-50" />
      <p className="text-sm">Searching...</p>
    </div>
  );
}

export function SearchError({ error, className }: { error?: Error, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-destructive text-center", className)}>
      <AlertTriangle className="h-8 w-8 mb-4 opacity-80" />
      <p className="text-sm font-medium">Search failed</p>
      <p className="text-xs opacity-80 mt-1">{error?.message || 'An unexpected error occurred.'}</p>
    </div>
  );
}
