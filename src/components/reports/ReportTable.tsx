import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportTableConfig } from './types';

interface ReportTableProps {
  config: ReportTableConfig;
  className?: string;
}

export function ReportTable({ config, className }: ReportTableProps) {
  if (!config.data || config.data.length === 0) return null;

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-gray-100/50 text-gray-700 uppercase font-semibold text-xs border-y">
          <tr>
            {config.columns.map((col, idx) => (
              <th 
                key={col.id || idx.toString()} 
                className={cn("px-4 py-3 whitespace-nowrap", {
                  'text-left': !col.align || col.align === 'left',
                  'text-center': col.align === 'center',
                  'text-right': col.align === 'right',
                })}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {config.data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className={cn(
                "avoid-break-inside transition-colors",
                config.striped && rowIndex % 2 === 1 ? "bg-gray-50/50" : "bg-white",
                config.bordered && "border-x border-b"
              )}
            >
              {config.columns.map((col, colIndex) => {
                const cellContent = col.cell ? col.cell(row) : row[col.accessorKey || ''];
                return (
                  <td 
                    key={col.id || colIndex.toString()} 
                    className={cn("px-4 py-3 align-top", {
                      'text-left': !col.align || col.align === 'left',
                      'text-center': col.align === 'center',
                      'text-right': col.align === 'right',
                    })}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
