import * as React from 'react';

export type ActivityType = 'comment' | 'status_change' | 'field_update' | 'email' | 'meeting' | 'note' | 'system' | 'assignment' | string;

export interface ActivityUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  action: string;
  timestamp: string | Date;
  actor: ActivityUser;
  target?: string;
  content?: React.ReactNode;
  metadata?: Record<string, any>;
  icon?: React.ReactNode;
}
