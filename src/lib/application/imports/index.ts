export interface ImportPreview<T> {
  validCount: number;
  invalidCount: number;
  validRows: T[];
  errors: { row: number; errors: string[] }[];
}

export interface ImportService<T> {
  parse(fileBuffer: Buffer, format: 'csv' | 'excel'): Promise<any[]>;
  validate(rows: any[]): Promise<ImportPreview<T>>;
  process(validRows: T[]): Promise<void>;
}
