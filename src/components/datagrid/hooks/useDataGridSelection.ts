'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';

export function useDataGridSelection() {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  return {
    rowSelection,
    setRowSelection,
  };
}
