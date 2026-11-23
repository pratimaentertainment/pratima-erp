'use client';

import * as React from 'react';
import { flexRender } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataGrid } from './hooks/useDataGrid';
import { DataGridToolbar } from './DataGridToolbar';
import { DataGridPagination } from './DataGridPagination';
import { DataGridCardView } from './DataGridCardView';
import { DataGridFilters } from './DataGridFilters';
import { DataGridRowActions } from './DataGridRowActions';
import { DataGridLoadingState, DataGridEmptyState, DataGridErrorState, DataGridNoResultsState } from './DataGridStates';
import type { DataGridProps } from './types';

export function DataGrid<TData>(props: DataGridProps<TData>) {
  const {
    data,
    loading,
    error,
    refreshing,
    onRefresh,
    rowActions,
    bulkActions,
    filters,
    enableCardViewOnMobile = true,
  } = props;

  const {
    table,
    globalFilter,
    rowSelection
  } = useDataGrid(props);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
      <DataGridToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={table.setGlobalFilter}
        bulkActions={bulkActions}
        filters={filters}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      
      <DataGridFilters table={table} filters={filters || []} />

      {enableCardViewOnMobile && (
        <DataGridCardView
          table={table}
          rowActions={rowActions}
          loading={loading}
          error={error}
        />
      )}

      <div className={cn("flex-1 overflow-auto", enableCardViewOnMobile ? "hidden lg:block" : "block")}>
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b sticky top-0 bg-muted/80 backdrop-blur z-[var(--z-sticky)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
                        isSortable && "cursor-pointer select-none hover:text-foreground"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {isSortable && (
                            <span className="w-4">
                              {isSorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-20" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
                {rowActions && rowActions.length > 0 && (
                  <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right w-[60px]">
                    Actions
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {loading ? (
              <DataGridLoadingState colSpan={table.getAllColumns().length + (rowActions ? 1 : 0)} />
            ) : error ? (
              <DataGridErrorState colSpan={table.getAllColumns().length + (rowActions ? 1 : 0)} error={error} />
            ) : table.getRowModel().rows.length === 0 ? (
              globalFilter || table.getState().columnFilters.length > 0 ? (
                <DataGridNoResultsState colSpan={table.getAllColumns().length + (rowActions ? 1 : 0)} />
              ) : (
                <DataGridEmptyState colSpan={table.getAllColumns().length + (rowActions ? 1 : 0)} />
              )
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <td className="p-4 align-middle text-right">
                      <DataGridRowActions row={row} actions={rowActions} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <DataGridPagination table={table} />
    </div>
  );
}
