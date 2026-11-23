import * as React from 'react';
import { cn } from '@/lib/utils';

export function DocumentTitle({ title, subtitle, className }: { title: string, subtitle?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function DocumentNumber({ label, number, className }: { label?: string, number: string, className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-xs text-gray-500 uppercase font-semibold">{label || 'Document No.'}</span>
      <span className="text-lg font-bold text-gray-900">{number}</span>
    </div>
  );
}

// Stubs for others
export const DocumentMetadata = () => null;
export const DocumentStatus = () => null;
