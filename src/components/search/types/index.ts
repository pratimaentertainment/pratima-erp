import * as React from 'react';

export type SearchCategory = 'all' | 'customers' | 'quotations' | 'invoices' | 'projects' | 'tasks' | 'users' | 'documents' | 'settings' | 'unknown';
export type SearchResultIntent = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface SearchActionConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  onAction: () => void;
  intent?: SearchResultIntent;
}

export interface SearchResultItemConfig {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, string | number>;
  url?: string;
  badges?: { label: string; intent?: SearchResultIntent }[];
  highlightMatches?: { field: string; indices: [number, number][] }[];
  score?: number;
  actions?: SearchActionConfig[];
}

export interface SearchGroupConfig {
  id: string;
  category: SearchCategory;
  label: string;
  items: SearchResultItemConfig[];
}

export interface SearchSuggestionConfig {
  id: string;
  text: string;
  icon?: React.ReactNode;
}
