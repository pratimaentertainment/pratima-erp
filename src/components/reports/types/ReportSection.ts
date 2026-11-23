import * as React from 'react';

export interface ReportSectionConfig {
  id: string;
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
  collapsible?: boolean;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
}
