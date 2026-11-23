import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportMetadataConfig } from './types';

interface ReportMetadataProps {
  config: ReportMetadataConfig;
  className?: string;
}

export function ReportMetadata({ config, className }: ReportMetadataProps) {
  const getLayoutClass = () => {
    if (config.layout === 'inline') return "flex flex-wrap gap-x-8 gap-y-2";
    if (config.layout === 'stacked') return "flex flex-col gap-2";
    // default grid
    return cn("grid gap-y-2 gap-x-6", `grid-cols-${config.columns || 2}`);
  };

  return (
    <div className={cn("bg-gray-50/50 p-4 rounded-sm border avoid-break-inside text-sm", className)}>
      {config.title && (
        <h4 className="font-semibold text-gray-700 mb-3 uppercase tracking-wider text-xs">{config.title}</h4>
      )}
      <div className={getLayoutClass()}>
        {config.fields.map((field, idx) => (
          <div key={idx} className={cn("flex", config.layout === 'inline' ? "gap-2 items-baseline" : "flex-col")}>
            <span className="text-gray-500 font-medium text-xs uppercase">{field.label}</span>
            <span className="font-semibold text-gray-900">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
