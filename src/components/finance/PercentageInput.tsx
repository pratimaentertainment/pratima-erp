import * as React from 'react';
import { cn } from '@/lib/utils';

interface PercentageInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
        <div className="relative">
          <input
            type="number"
            step="0.01"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background pr-7 pl-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger focus-visible:ring-danger",
              className
            )}
            ref={ref}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
        </div>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
PercentageInput.displayName = 'PercentageInput';
