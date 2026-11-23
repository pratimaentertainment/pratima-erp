import * as React from 'react';

export type WorkflowStatusType = 'Draft' | 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled' | 'Archived' | string;

export interface WorkflowTransition {
  id: string;
  label: React.ReactNode;
  toStatus: WorkflowStatusType;
  requiresReason?: boolean;
  requiresApproval?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'warning' | 'outline' | 'ghost' | 'success';
  icon?: React.ReactNode;
}

export interface WorkflowHistoryEvent {
  id: string;
  action: string;
  fromStatus?: WorkflowStatusType;
  toStatus?: WorkflowStatusType;
  timestamp: string | Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  reason?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'rejected' | 'skipped';
  description?: string;
}
