import * as React from 'react';

export interface RevisionRecord {
  id: string;
  version: number | string;
  createdAt: string | Date;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  reason?: string;
  status: string;
  isCurrent?: boolean;
}
