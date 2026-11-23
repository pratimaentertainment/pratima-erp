import * as React from 'react';
import { cn } from '@/lib/utils';
import { XCircle } from 'lucide-react';

interface EntityValidationSummaryProps {
  errors: Array<{ field?: string; message: string }>;
  className?: string;
}

export function EntityValidationSummary({ errors, className }: EntityValidationSummaryProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={cn("bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md flex items-start gap-3", className)}>
      <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex flex-col text-sm">
        <span className="font-medium mb-1">Please fix the following errors to save:</span>
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, idx) => (
            <li key={idx}>
              {error.field && <span className="font-semibold mr-1">{error.field}:</span>}
              {error.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
