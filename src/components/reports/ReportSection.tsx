import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportSectionConfig } from './types';

interface ReportSectionProps {
  config: ReportSectionConfig;
  className?: string;
  children?: React.ReactNode;
}

export function ReportSection({ config, className, children }: ReportSectionProps) {
  return (
    <section 
      className={cn(
        "mb-8",
        config.pageBreakBefore && "page-break-before",
        config.pageBreakAfter && "page-break-after",
        className
      )}
    >
      {(config.title || config.subtitle) && (
        <div className="mb-4 avoid-break-inside border-b pb-2">
          {config.title && <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{config.title}</h3>}
          {config.subtitle && <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>}
        </div>
      )}
      <div className="w-full">
        {config.content || children}
      </div>
    </section>
  );
}
