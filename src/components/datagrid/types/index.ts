import { type ColumnDef, type RowData, type Table } from '@tanstack/react-table';

export type FilterType = 
  | 'text'
  | 'number'
  | 'date'
  | 'dateRange'
  | 'boolean'
  | 'singleSelect'
  | 'multiSelect'
  | 'status'
  | 'custom';

export interface DataGridFilter {
  id: string;
  label: string;
  type: FilterType;
  options?: { label: string; value: string | number }[];
  customRenderer?: (props: { value: any; onChange: (value: any) => void }) => React.ReactNode;
}

export interface DataGridAction<TData = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDestructive?: boolean;
  onClick: (row: TData) => void;
  show?: (row: TData) => boolean;
}

export interface BulkAction<TData = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDestructive?: boolean;
  onClick: (selectedRows: TData[]) => void;
  show?: (selectedRows: TData[]) => boolean;
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    isExportable?: boolean;
    filterType?: FilterType;
    mobileRenderer?: (info: { row: TData; value: TValue }) => React.ReactNode;
    mobileHidden?: boolean;
    mobileLabel?: string;
  }
}

export type DataGridColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue>;

export interface DataGridProps<TData> {
  data: TData[];
  columns: DataGridColumnDef<TData, any>[];
  totalRows?: number;
  
  // State
  loading?: boolean;
  error?: React.ReactNode;
  refreshing?: boolean;
  
  // Handlers
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf' | 'print') => void;
  
  // Configuration
  filters?: DataGridFilter[];
  rowActions?: DataGridAction<TData>[];
  bulkActions?: BulkAction<TData>[];
  
  // Features
  enableRowSelection?: boolean;
  enableColumnPinning?: boolean;
  enableColumnResizing?: boolean;
  enableCardViewOnMobile?: boolean;
  
  // Search URL sync flag (true by default)
  syncUrlParams?: boolean;
}
