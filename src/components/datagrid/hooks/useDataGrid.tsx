'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type VisibilityState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useDataGridPagination } from './useDataGridPagination';
import { useDataGridFilters } from './useDataGridFilters';
import { useDataGridSelection } from './useDataGridSelection';
import type { DataGridProps } from '../types';

export function useDataGrid<TData>({
  data,
  columns,
  totalRows,
  syncUrlParams = true,
  enableRowSelection = false,
}: DataGridProps<TData>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  const { pagination, setPagination } = useDataGridPagination(syncUrlParams);
  const {
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
  } = useDataGridFilters(syncUrlParams);
  
  const { rowSelection, setRowSelection } = useDataGridSelection();

  // Handle Select Column Injection
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectColumn: ColumnDef<TData, any> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={table.getIsAllPageRowsSelected()}
          ref={input => {
            if (input) {
              input.indeterminate = table.getIsSomePageRowsSelected();
            }
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };
    
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
    },
    pageCount: totalRows ? Math.ceil(totalRows / pagination.pageSize) : undefined,
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Server side by default for ERP
    manualSorting: true, // Server side by default for ERP
    manualFiltering: true, // Server side by default for ERP
  });

  return {
    table,
    pagination,
    sorting,
    globalFilter,
    columnFilters,
    rowSelection,
  };
}
