import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportConfig } from './types';

interface ReportHeaderProps {
  config: ReportConfig;
  documentTitle?: string;
  documentSubtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ReportHeader({ config, documentTitle, documentSubtitle, className, children }: ReportHeaderProps) {
  return (
    <header className={cn("flex justify-between items-start border-b pb-4 mb-6 avoid-break-inside", className)}>
      <div className="flex flex-col gap-2 max-w-[50%]">
        {config.branding?.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={config.branding.logoUrl} 
            alt={config.branding.companyName || 'Company Logo'} 
            className="h-12 object-contain"
          />
        ) : (
          <h1 className="text-xl font-bold text-[var(--report-primary)]">
            {config.branding?.companyName || 'Company Name'}
          </h1>
        )}
        {children}
      </div>
      
      <div className="flex flex-col items-end text-right">
        <h2 className="text-2xl font-bold uppercase tracking-wider text-[var(--report-primary)]">
          {documentTitle || config.title}
        </h2>
        {documentSubtitle && (
          <p className="text-sm text-gray-500 font-medium mt-1">{documentSubtitle}</p>
        )}
      </div>
    </header>
  );
}
