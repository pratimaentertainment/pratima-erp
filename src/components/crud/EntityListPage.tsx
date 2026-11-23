'use client';

import * as React from 'react';
import { ModuleListLayout } from '@/components/layout/layouts';
import { EntityPageHeader, type EntityPageHeaderProps } from './EntityPageHeader';
import { EntityToolbar, type EntityToolbarProps } from './EntityToolbar';
import { EntityStatsBar, type EntityStatsBarProps } from './EntityStatsBar';
import { DataGridFilters } from '@/components/datagrid/DataGridFilters';
import { DataGridCardView } from '@/components/datagrid/DataGridCardView';
import { DataGridPagination } from '@/components/datagrid/DataGridPagination';
import { DataGridLoadingState, DataGridEmptyState, DataGridErrorState, DataGridNoResultsState } from '@/components/datagrid/DataGridStates';
import { DataGridRowActions } from '@/components/datagrid/DataGridRowActions';
import { flexRender, type Table } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataGridAction } from '@/components/datagrid/types';

export interface EntityListPageProps<TData> {
  header: EntityPageHeaderProps;
  stats?: EntityStatsBarProps['stats'];
  toolbar: Omit<EntityToolbarProps<TData>, 'table' | 'globalFilter' | 'setGlobalFilter'>;
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  rowActions?: DataGridAction<TData>[];
  loading?: boolean;
  error?: React.ReactNode;
}

export function EntityListPage<TData>({
  header,
  stats,
  toolbar,
  table,
  globalFilter,
  setGlobalFilter,
  rowActions,
  loading,
  error
}: EntityListPageProps<TData>) {
  return (
    <ModuleListLayout
      header={
        <EntityPageHeader
          title={header.title}
          subtitle={header.subtitle}
          breadcrumbs={header.breadcrumbs}
          statusBadge={header.statusBadge}
          tags={header.tags}
          primaryAction={header.primaryAction}
          secondaryActions={header.secondaryActions}
          contextMenu={header.contextMenu}
        />
      }
    >
      <div className="flex flex-col gap-6">
        {stats && <EntityStatsBar stats={stats} />}
        
        <div className="flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
          <EntityToolbar
            table={table}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            {...toolbar}
          />
          
          <DataGridFilters table={table} filters={toolbar.filters || []} />

          <DataGridCardView
            table={table}
            rowActions={rowActions}
            loading={loading}
            error={error}
          />

          <div className="flex-1 overflow-auto hidden lg:block">
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
      </div>
    </ModuleListLayout>
  );
}
