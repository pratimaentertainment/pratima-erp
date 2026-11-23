import * as React from 'react';

export type EntityEditPolicy = 'editable' | 'readOnly' | 'archived' | 'locked' | 'pendingApproval';

export interface EntityEditAction {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  hidden?: boolean;
}
