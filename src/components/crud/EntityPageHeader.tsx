import * as React from 'react';
import { Badge } from '@/components/badges/Badge';

export interface EntityPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  statusBadge?: React.ReactNode | { label: string; variant?: "info" | "success" | "warning" | "danger" | "neutral" };
  tags?: string[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  contextMenu?: React.ReactNode;
}

export function EntityPageHeader({
  title,
  subtitle,
  breadcrumbs,
  statusBadge,
  tags,
  primaryAction,
  secondaryActions,
  contextMenu
}: EntityPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {breadcrumbs && <div className="text-sm text-muted-foreground">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {statusBadge && (
              React.isValidElement(statusBadge) ? statusBadge : (
                <Badge variant={(statusBadge as any).variant || 'neutral'}>{(statusBadge as any).label}</Badge>
              )
            )}
            {tags && tags.length > 0 && (
              <div className="flex gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="neutral">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {secondaryActions}
          {primaryAction}
          {contextMenu}
        </div>
      </div>
    </div>
  );
}
