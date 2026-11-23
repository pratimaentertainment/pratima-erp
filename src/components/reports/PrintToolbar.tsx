import * as React from 'react';
import { cn } from '@/lib/utils';

interface PrintToolbarProps {
  title?: string;
  onPrint: () => void;
  onDownloadPdf?: () => void;
  onEmail?: () => void;
  onExport?: () => void;
  className?: string;
}

export function PrintToolbar({ title, onPrint, onDownloadPdf, onEmail, onExport, className }: PrintToolbarProps) {
  return (
    <div className={cn("sticky top-0 z-40 flex items-center justify-between p-4 bg-background border-b shadow-sm no-print", className)}>
      <div className="font-semibold">{title || 'Print Preview'}</div>
      <div className="flex items-center gap-2">
        {onEmail && (
          <button onClick={onEmail} className="px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
            Email
          </button>
        )}
        {onExport && (
          <button onClick={onExport} className="px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
            Export
          </button>
        )}
        {onDownloadPdf && (
          <button onClick={onDownloadPdf} className="px-3 py-1.5 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
            Download PDF
          </button>
        )}
        <button onClick={onPrint} className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Print
        </button>
      </div>
    </div>
  );
}
