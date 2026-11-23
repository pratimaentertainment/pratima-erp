import * as React from 'react';

export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost';

export interface ActionDefinition {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: ActionVariant;
  disabled?: boolean;
  hidden?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  onClick: () => void | Promise<void>;
  shortcut?: string[];
  href?: string;
}

export interface ActionGroupDefinition {
  id: string;
  label?: string;
  actions: ActionDefinition[];
}
