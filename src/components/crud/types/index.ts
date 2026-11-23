import type { DataGridColumnDef, DataGridFilter, DataGridAction, BulkAction } from '@/components/datagrid/types';

export interface EntityConfig<TData> {
  id: string;
  title: string;
  singular: string;
  plural: string;
  icon?: React.ReactNode;
  defaultSort?: string;
  defaultOrder?: 'asc' | 'desc';
  searchPlaceholder?: string;
  defaultColumns?: DataGridColumnDef<TData, any>[];
  defaultFilters?: DataGridFilter[];
}

export type EntityAction<TData = any> = DataGridAction<TData>;

export type EntityBulkAction<TData = any> = BulkAction<TData>;
