'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { type PaginationState } from '@tanstack/react-table';

export function useDataGridPagination(syncUrlParams: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPageIndex = syncUrlParams ? Number(searchParams.get('page')) || 0 : 0;
  const initialPageSize = syncUrlParams ? Number(searchParams.get('limit')) || 10 : 10;

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  // Sync state to URL if enabled
  React.useEffect(() => {
    if (!syncUrlParams) return;

    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    const urlPage = Number(currentParams.get('page')) || 0;
    const urlLimit = Number(currentParams.get('limit')) || 10;

    let changed = false;

    if (pagination.pageIndex !== urlPage) {
      if (pagination.pageIndex === 0) {
        currentParams.delete('page');
      } else {
        currentParams.set('page', pagination.pageIndex.toString());
      }
      changed = true;
    }

    if (pagination.pageSize !== urlLimit) {
      if (pagination.pageSize === 10) {
        currentParams.delete('limit');
      } else {
        currentParams.set('limit', pagination.pageSize.toString());
      }
      changed = true;
    }

    if (changed) {
      router.push(`${pathname}?${currentParams.toString()}`, { scroll: false });
    }
  }, [pagination, syncUrlParams, router, pathname, searchParams]);

  // Sync URL to state if URL changes externally (e.g., back button)
  React.useEffect(() => {
    if (!syncUrlParams) return;
    const urlPage = Number(searchParams.get('page')) || 0;
    const urlLimit = Number(searchParams.get('limit')) || 10;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPagination((prev) => {
      if (prev.pageIndex !== urlPage || prev.pageSize !== urlLimit) {
        return { pageIndex: urlPage, pageSize: urlLimit };
      }
      return prev;
    });
  }, [searchParams, syncUrlParams]);

  return {
    pagination,
    setPagination,
  };
}
