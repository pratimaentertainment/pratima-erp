import * as React from 'react';
export * from './types';
export * from './StateBadge';
export * from './StateTransitionMenu';

// Stubs for the rest of the generic framework
export const StateActionButton = () => null;
export const StateProgress = () => null;
export const StateHistory = () => null;
export const StateTransitionDialog = () => null;
export const StateGuard = ({ children }: { children: React.ReactNode }) => children as any;
