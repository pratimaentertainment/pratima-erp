import * as React from 'react';
import type { ReportConfig, ReportTableConfig, ReportSummaryConfig, ReportMetadataConfig } from '@/components/reports';

export interface DocumentTemplateData {
  metadata: ReportMetadataConfig;
  table: ReportTableConfig;
  summary: ReportSummaryConfig;
}

export interface DocumentTemplateProps {
  config: ReportConfig;
  data: DocumentTemplateData;
  className?: string;
}
