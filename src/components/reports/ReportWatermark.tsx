import * as React from 'react';
import { cn } from '@/lib/utils';

interface ReportWatermarkProps {
  text: string;
  className?: string;
}

export function ReportWatermark({ text, className }: ReportWatermarkProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden z-[-1]", className)}>
      <div 
        className="text-[120px] font-bold text-gray-100 uppercase tracking-widest whitespace-nowrap opacity-50"
        style={{ transform: 'rotate(-45deg)' }}
      >
        {text}
      </div>
    </div>
  );
}
