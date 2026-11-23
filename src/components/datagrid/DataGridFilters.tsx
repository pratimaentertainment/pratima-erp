'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import type { DataGridFilter } from './types';

interface DataGridFiltersProps<TData> {
  table: Table<TData>;
  filters: DataGridFilter[];
}

/**
 * Enterprise Faceted Filters
 * To be expanded with specific renderers for Number Range, Date Range, Multi-Select, etc.
 */
export function DataGridFilters<TData>({ table, filters }: DataGridFiltersProps<TData>) {
  if (!filters || filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 pt-0 border-b">
      {filters.map((filter) => {
        const column = table.getColumn(filter.id);
        if (!column) return null;
        
        const columnFilterValue = column.getFilterValue();

        if (filter.customRenderer) {
          return (
            <div key={filter.id}>
              {filter.customRenderer({
                value: columnFilterValue,
                onChange: (val) => column.setFilterValue(val),
              })}
            </div>
          );
        }

        // Basic Select Filter
        if (filter.type === 'singleSelect' || filter.type === 'status') {
          return (
            <select
              key={filter.id}
              value={(columnFilterValue ?? '') as string}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All {filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        return null;
      })}
    </div>
  );
}
