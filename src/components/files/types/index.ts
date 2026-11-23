import * as React from 'react';
import type { DocumentType } from '@/components/document-viewer';

export type FileState = 'Uploading' | 'Uploaded' | 'Processing' | 'Failed' | 'Archived' | 'Deleted';

export interface FileRecord {
  id: string;
  filename: string;
  size: number;
  type: DocumentType;
  mimeType: string;
  url: string;
  state: FileState;
  uploadedAt: string | Date;
  uploadedBy: {
    id: string;
    name: string;
  };
  version?: number;
  metadata?: Record<string, any>;
}
