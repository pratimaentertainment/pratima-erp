'use client';

import * as React from 'react';
import { DataGridRowActions } from '@/components/datagrid/DataGridRowActions';
import type { Row } from '@tanstack/react-table';
import type { EntityAction } from './types';

export interface EntityActionsProps<TData> {
  row: Row<TData>;
  actions: EntityAction<TData>[];
}

export function EntityActions<TData>({ row, actions }: EntityActionsProps<TData>) {
  return <DataGridRowActions row={row} actions={actions} />;
}
