import * as React from 'react';

export interface ReportTableColumn {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: string;
  cell?: (row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface ReportTableConfig {
  columns: ReportTableColumn[];
  data: any[];
  showFooter?: boolean;
  striped?: boolean;
  bordered?: boolean;
}
