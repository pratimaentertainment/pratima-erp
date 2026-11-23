import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  ReportLayout, 
  ReportHeader, 
  ReportFooter, 
  ReportTable, 
  ReportSummary, 
  ReportMetadata 
} from '@/components/reports';
import type { DocumentTemplateProps } from './types';

export function BaseDocumentTemplate({ config, data, className }: DocumentTemplateProps) {
  return (
    <ReportLayout config={config} className={cn("p-8", className)}>
      <ReportHeader config={config} documentTitle={data.metadata.title} />
      
      <div className="mb-8">
        <ReportMetadata config={data.metadata} />
      </div>
      
      <div className="mb-8">
        <ReportTable config={data.table} />
      </div>
      
      <div className="mb-8">
        <ReportSummary config={data.summary} />
      </div>
      
      <ReportFooter config={config} />
    </ReportLayout>
  );
}
