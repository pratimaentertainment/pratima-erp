import * as React from 'react';

export type DocumentType = 'image' | 'pdf' | 'video' | 'audio' | 'office' | 'unknown';

export interface DocumentViewerProps {
  url: string;
  type: DocumentType;
  filename: string;
  className?: string;
  onError?: (error: Error) => void;
}
