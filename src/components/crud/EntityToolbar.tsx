'use client';

import * as React from 'react';
import { DataGridToolbar } from '@/components/datagrid/DataGridToolbar';
import { type Table } from '@tanstack/react-table';
import type { DataGridFilter, BulkAction } from '@/components/datagrid/types';

export interface EntityToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  bulkActions?: BulkAction<TData>[];
  filters?: DataGridFilter[];
  onRefresh?: () => void;
  refreshing?: boolean;
  exportAction?: React.ReactNode;
  customSlot?: React.ReactNode;
}

export function EntityToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  bulkActions,
  filters,
  onRefresh,
  refreshing,
  exportAction,
  customSlot
}: EntityToolbarProps<TData>) {
  return (
    <div className="flex flex-col border-b bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          {customSlot}
        </div>
        <div className="flex items-center gap-2">
          {exportAction}
        </div>
      </div>
      <DataGridToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        bulkActions={bulkActions}
        filters={filters}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}
