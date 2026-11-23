import * as React from 'react';

export interface DashboardLayoutConfig {
  columns: number | { sm: number; md: number; lg: number; xl: number };
  gap?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface DashboardWidgetConfig {
  id: string;
  title?: string;
  subtitle?: string;
  colSpan?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  rowSpan?: number;
  minHeight?: string;
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
}

export interface MetricConfig {
  label: string;
  value: string | number;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  intent?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  series?: { key: string; name: string; color: string }[];
  height?: number;
}
