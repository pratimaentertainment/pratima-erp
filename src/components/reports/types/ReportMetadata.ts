import * as React from 'react';

export interface ReportMetadataField {
  label: string;
  value: string | React.ReactNode;
}

export interface ReportMetadataConfig {
  title?: string;
  fields: ReportMetadataField[];
  layout?: 'grid' | 'inline' | 'stacked';
  columns?: number;
}
