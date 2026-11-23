import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportConfig } from './types';

interface ReportFooterProps {
  config: ReportConfig;
  className?: string;
  children?: React.ReactNode;
}

export function ReportFooter({ config, className, children }: ReportFooterProps) {
  return (
    <footer className={cn("mt-12 pt-4 border-t text-xs text-gray-500 avoid-break-inside flex justify-between items-center", className)}>
      <div className="flex flex-col">
        {children || (
          <p>This is a computer-generated document. No signature is required.</p>
        )}
      </div>
      
      {config.showPageNumbers && (
        <div className="text-right print:block hidden">
          Page <span className="pageNumber"></span> of <span className="totalPages"></span>
        </div>
      )}
    </footer>
  );
}
