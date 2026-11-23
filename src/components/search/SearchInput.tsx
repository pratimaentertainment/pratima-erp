import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  isLoading?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, isLoading, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={ref}
          type="text"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />
        <div className="absolute right-3 flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {props.value && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
