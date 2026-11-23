import * as React from 'react';
import { cn } from '@/lib/utils';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
}

export function MoneyDisplay({ amount, currency = 'USD', locale = 'en-US', className }: MoneyDisplayProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);

  return <span className={cn("font-medium", className)}>{formatted}</span>;
}
