import * as React from 'react';

// Using standard generic presentation states
export type SystemState = 'Draft' | 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled' | 'Closed' | 'Archived' | 'Active' | 'Inactive' | string;

export interface StateMachineDefinition {
  currentState: SystemState;
  availableTransitions: StateTransition[];
  history?: StateHistoryEvent[];
}

export interface StateTransition {
  id: string;
  label: string;
  toState: SystemState;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  onTransition: () => void | Promise<void>;
}

export interface StateHistoryEvent {
  id: string;
  fromState?: SystemState;
  toState: SystemState;
  timestamp: string | Date;
  user: {
    id: string;
    name: string;
  };
  reason?: string;
}
