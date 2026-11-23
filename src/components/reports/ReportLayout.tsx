import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportConfig } from './types';
import { PrintStyles } from './PrintStyles';

interface ReportLayoutProps {
  config: ReportConfig;
  children: React.ReactNode;
  className?: string;
}

export function ReportLayout({ config, children, className }: ReportLayoutProps) {
  // Map paper sizes to classes
  const getPaperClass = () => {
    switch(config.paperSize) {
      case 'letter': return 'print-letter';
      case 'legal': return 'print-legal';
      case 'thermal': return 'print-thermal';
      case 'custom': return '';
      case 'A4-landscape': return 'print-a4-landscape';
      case 'A4':
      default: return 'print-a4';
    }
  };

  return (
    <div 
      className={cn(
        "report-container bg-white text-black mx-auto shadow-sm print:shadow-none print:m-0",
        getPaperClass(),
        className
      )}
      style={{
        '--report-primary': config.branding?.primaryColor || '#000000',
      } as React.CSSProperties}
    >
      <PrintStyles />
      {children}
    </div>
  );
}
