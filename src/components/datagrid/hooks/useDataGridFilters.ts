'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { type SortingState, type ColumnFiltersState } from '@tanstack/react-table';

export function useDataGridFilters(syncUrlParams: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize sorting
  const initialSort = searchParams.get('sort');
  const initialOrder = searchParams.get('order');
  const initialSorting: SortingState = initialSort ? [{ id: initialSort, desc: initialOrder === 'desc' }] : [];

  // Initialize search
  const initialGlobalFilter = searchParams.get('search') || '';

  // Initialize column filters (extract anything that starts with filter_)
  const initialColumnFilters: ColumnFiltersState = [];
  if (syncUrlParams) {
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const columnId = key.replace('filter_', '');
        initialColumnFilters.push({ id: columnId, value });
      }
    });
  }

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = React.useState<string>(initialGlobalFilter);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialColumnFilters);

  // Sync state to URL
  React.useEffect(() => {
    if (!syncUrlParams) return;

    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    let changed = false;

    // Sort sync
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      if (currentParams.get('sort') !== id || currentParams.get('order') !== (desc ? 'desc' : 'asc')) {
        currentParams.set('sort', id);
        currentParams.set('order', desc ? 'desc' : 'asc');
        changed = true;
      }
    } else {
      if (currentParams.has('sort') || currentParams.has('order')) {
        currentParams.delete('sort');
        currentParams.delete('order');
        changed = true;
      }
    }

    // Search sync
    if (globalFilter) {
      if (currentParams.get('search') !== globalFilter) {
        currentParams.set('search', globalFilter);
        changed = true;
      }
    } else {
      if (currentParams.has('search')) {
        currentParams.delete('search');
        changed = true;
      }
    }

    // Column Filters sync
    // First remove all existing filter_ params
    const keysToDelete: string[] = [];
    currentParams.forEach((_, key) => {
      if (key.startsWith('filter_')) keysToDelete.push(key);
    });
    keysToDelete.forEach(key => currentParams.delete(key));

    // Then set current filters
    columnFilters.forEach(filter => {
      if (filter.value !== undefined && filter.value !== '') {
        currentParams.set(`filter_${filter.id}`, String(filter.value));
      }
    });
    
    // Check if filters changed by comparing reconstructed string to actual URL (rough heuristic)
    // A better approach is to rely on standard useEffect deps, but we just push the URL if changed=true OR if columnFilters length/values differ from URL.
    // For simplicity, we assume if we reached here, and we recomputed, we just push if currentParams.toString() !== searchParams.toString()
    if (currentParams.toString() !== searchParams.toString()) {
      // Reset page to 0 when filters change to avoid empty pages
      if (currentParams.has('page') && (changed || columnFilters !== initialColumnFilters)) {
        currentParams.delete('page');
      }
      router.push(`${pathname}?${currentParams.toString()}`, { scroll: false });
    }
  }, [sorting, globalFilter, columnFilters, syncUrlParams, router, pathname, searchParams]);

  return {
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
  };
}
