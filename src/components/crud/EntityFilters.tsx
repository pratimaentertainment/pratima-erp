'use client';

import * as React from 'react';
import { DataGridFilters } from '@/components/datagrid/DataGridFilters';
import { type Table } from '@tanstack/react-table';
import type { DataGridFilter } from '@/components/datagrid/types';

export interface EntityFiltersProps<TData> {
  table: Table<TData>;
  filters: DataGridFilter[];
}

export function EntityFilters<TData>({ table, filters }: EntityFiltersProps<TData>) {
  return <DataGridFilters table={table} filters={filters} />;
}
