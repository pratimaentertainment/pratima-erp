import * as React from 'react';

export interface ReportSummaryItem {
  id: string;
  label: string;
  value: string | number | React.ReactNode;
  variant?: 'normal' | 'highlight' | 'total';
}

export interface ReportSummaryConfig {
  items: ReportSummaryItem[];
  notes?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
}
