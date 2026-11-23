'use client';

import * as React from 'react';
import { type Table, flexRender } from '@tanstack/react-table';
import { DataGridRowActions } from './DataGridRowActions';
import type { DataGridAction } from './types';
import { ContentCard } from '@/components/cards';
import { DataGridLoadingState, DataGridEmptyState, DataGridErrorState, DataGridNoResultsState } from './DataGridStates';

interface DataGridCardViewProps<TData> {
  table: Table<TData>;
  rowActions?: DataGridAction<TData>[];
  loading?: boolean;
  error?: React.ReactNode;
}

export function DataGridCardView<TData>({
  table,
  rowActions,
  loading,
  error
}: DataGridCardViewProps<TData>) {
  const rows = table.getRowModel().rows;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <ContentCard key={i} loading={true} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ContentCard error={error} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-4">
        <ContentCard empty={true} emptyMessage="No results found." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:hidden">
      {rows.map((row) => {
        // Find a title column (heuristic: first visible column that isn't select/actions)
        const visibleCells = row.getVisibleCells();
        const titleCell = visibleCells.find(c => c.column.id !== 'select' && c.column.id !== 'actions');
        const otherCells = visibleCells.filter(c => c !== titleCell && c.column.id !== 'select' && c.column.id !== 'actions');

        const titleContent = titleCell ? flexRender(titleCell.column.columnDef.cell, titleCell.getContext()) : `Row ${row.id}`;
        
        return (
          <ContentCard
            key={row.id}
            title={titleContent}
            actions={
              <div className="flex items-center gap-2">
                {row.getCanSelect() && (
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                  />
                )}
                {rowActions && <DataGridRowActions row={row} actions={rowActions} />}
              </div>
            }
          >
            <div className="flex flex-col gap-2 mt-2">
              {otherCells.map((cell) => {
                // Skip if mobile renderer is hidden
                const meta = cell.column.columnDef.meta as any;
                if (meta?.mobileHidden) return null;

                const label = meta?.mobileLabel || (typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id);
                
                let content;
                if (meta?.mobileRenderer) {
                  content = meta.mobileRenderer({ row: row.original, value: cell.getValue() });
                } else {
                  content = flexRender(cell.column.columnDef.cell, cell.getContext());
                }

                return (
                  <div key={cell.id} className="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground mr-4">{label}</span>
                    <span className="font-medium text-right">{content}</span>
                  </div>
                );
              })}
            </div>
          </ContentCard>
        );
      })}
    </div>
  );
}
