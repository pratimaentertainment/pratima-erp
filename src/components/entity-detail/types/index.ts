import * as React from 'react';

export interface EntityDetailTab {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface EntityDetailAction {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  hidden?: boolean;
}

export interface EntityMetadataItem {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export interface EntityTimelineEvent {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp: string | Date;
  status?: string;
  icon?: React.ReactNode;
  user?: {
    name: string;
    avatar?: string;
  };
}
