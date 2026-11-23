'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import { Search, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/buttons/Button';
import { DataGridColumnToggle } from './DataGridColumnToggle';
import { DataGridBulkActions } from './DataGridBulkActions';
import type { BulkAction, DataGridFilter } from './types';

interface DataGridToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  bulkActions?: BulkAction<TData>[];
  filters?: DataGridFilter[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DataGridToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  bulkActions = [],
  onRefresh,
  refreshing
}: DataGridToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter !== '';

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search all columns..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-9 w-[150px] lg:w-[250px] rounded-md border border-input bg-transparent pl-9 pr-4 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                setGlobalFilter('');
              }}
              className="h-8 px-2 lg:px-3 text-xs"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <DataGridColumnToggle table={table} />
        </div>
      </div>
      
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="pt-2">
          <DataGridBulkActions table={table} actions={bulkActions} />
        </div>
      )}
    </div>
  );
}
