import * as React from 'react';
import { MoneyDisplay } from './MoneyDisplay';

interface DiscountSummaryProps {
  discountName?: string;
  discountAmount: number;
  currency?: string;
}

export function DiscountSummary({ discountName = 'Discount', discountAmount, currency }: DiscountSummaryProps) {
  if (discountAmount <= 0) return null;
  return (
    <div className="flex justify-between items-center text-sm text-danger">
      <span>{discountName}</span>
      <span>-<MoneyDisplay amount={discountAmount} currency={currency} /></span>
    </div>
  );
}
