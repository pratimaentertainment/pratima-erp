import * as React from 'react';

export interface ReportConfig {
  id: string;
  type: string;
  title: string;
  paperSize?: 'A4' | 'A4-landscape' | 'letter' | 'legal' | 'thermal' | 'custom';
  orientation?: 'portrait' | 'landscape';
  theme?: 'light' | 'dark' | 'system';
  branding?: {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
  };
  showPageNumbers?: boolean;
  watermark?: string;
}
