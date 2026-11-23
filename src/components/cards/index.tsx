import * as React from 'react';
import { cn } from '@/lib/utils';
import { SkeletonLoader } from '@/components/loading';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: React.ReactNode;
  emptyMessage?: React.ReactNode;
}

export function ContentCard({
  title,
  subtitle,
  actions,
  footer,
  loading,
  empty,
  error,
  emptyMessage = "No data available",
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col", className)} {...props}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col space-y-1.5 p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-2">
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-5/6" />
            <SkeletonLoader className="h-4 w-4/6" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-danger">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="flex items-center p-6 pt-0 mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
}

export function SummaryCard({
  title,
  subtitle,
  actions,
  footer,
  loading,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 text-card-foreground p-4", className)} {...props}>
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && <h4 className="font-medium text-sm">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="text-sm">
        {loading ? (
          <SkeletonLoader className="h-4 w-full" />
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export interface MetricCardProps extends CardProps {
  value: string | number;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  comparison?: string;
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  subtitle,
  value,
  trend,
  comparison,
  sparkline,
  icon,
  loading,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col", className)} {...props}>
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          {title && <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>}
        </div>
        {icon && <div className="text-muted-foreground h-4 w-4">{icon}</div>}
      </div>
      <div className="flex-1 flex flex-col justify-end">
        {loading ? (
          <div className="space-y-2 mt-2">
            <SkeletonLoader className="h-8 w-24" />
            <SkeletonLoader className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div className="text-2xl font-bold">{value}</div>
              {sparkline && <div className="h-8 flex-1 max-w-[120px] ml-auto">{sparkline}</div>}
            </div>
            
            {(subtitle || trend || comparison) && (
              <div className="flex items-center mt-2 text-xs">
                {trend && (
                  <span className={cn("mr-2 font-medium flex items-center", trend.isPositive ? "text-success" : "text-danger")}>
                    {trend.isPositive ? '+' : '-'}{trend.value}
                  </span>
                )}
                {comparison && <span className="text-muted-foreground mr-1">{comparison}</span>}
                {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
