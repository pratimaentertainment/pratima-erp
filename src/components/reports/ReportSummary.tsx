import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportSummaryConfig } from './types';

interface ReportSummaryProps {
  config: ReportSummaryConfig;
  className?: string;
}

export function ReportSummary({ config, className }: ReportSummaryProps) {
  const isGrid = config.layout === 'grid';
  
  return (
    <div className={cn("flex flex-col md:flex-row justify-end gap-8 avoid-break-inside", className)}>
      {config.notes && (
        <div className="flex-1 text-sm text-gray-500">
          <h4 className="font-semibold text-gray-700 mb-1">Notes</h4>
          <p className="whitespace-pre-wrap">{config.notes}</p>
        </div>
      )}
      
      <div className={cn(
        "min-w-[300px]",
        isGrid ? "grid grid-cols-2 gap-x-4 gap-y-2" : "flex flex-col gap-2"
      )}>
        {config.items.map(item => (
          <div 
            key={item.id}
            className={cn(
              "flex justify-between items-center text-sm",
              item.variant === 'highlight' && "font-semibold text-gray-900 bg-gray-50 p-2 rounded",
              item.variant === 'total' && "font-bold text-base text-[var(--report-primary)] border-t-2 border-b-2 py-2 my-1"
            )}
          >
            <span className={cn(
              "text-gray-600",
              item.variant === 'total' && "text-gray-900"
            )}>{item.label}</span>
            <span className={cn(
              "text-right",
              item.variant === 'total' && "text-[var(--report-primary)]"
            )}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
