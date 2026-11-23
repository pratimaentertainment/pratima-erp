import * as React from 'react';
import { Badge, type BadgeProps } from './Badge';

export interface StatusBadgeProps extends Omit<BadgeProps, 'children'> {
  status: string;
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  return (
    <Badge {...props}>
      {status}
    </Badge>
  );
}

export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number;
  maxCount?: number;
}

export function CountBadge({ count, maxCount = 99, ...props }: CountBadgeProps) {
  const displayCount = count > maxCount ? `${maxCount}+` : count;
  
  return (
    <Badge {...props}>
      {displayCount}
    </Badge>
  );
}

export interface NotificationBadgeProps extends Omit<BadgeProps, 'children'> {
  count?: number;
  dotOnly?: boolean;
}

export function NotificationBadge({ count, dotOnly, className, ...props }: NotificationBadgeProps) {
  if (dotOnly || count === undefined) {
    return (
      <Badge
        {...props}
        className={`h-2.5 w-2.5 rounded-full p-0 flex items-center justify-center ${className || ''}`}
      />
    );
  }

  return <CountBadge count={count} className={className} {...props} />;
}
