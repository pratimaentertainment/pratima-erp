export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExportRequest {
  entityType: string;
  format: ExportFormat;
  filters?: Record<string, any>;
  selectedIds?: string[];
  columns?: string[];
}

export interface ExportService {
  exportData(request: ExportRequest, data: any[]): Promise<Buffer | string>;
}

export class BaseExportService implements ExportService {
  async exportData(request: ExportRequest, data: any[]): Promise<Buffer | string> {
    if (request.format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    throw new Error(`Export format ${request.format} not implemented yet`);
  }
}
