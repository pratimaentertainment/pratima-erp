import * as React from 'react';
import { MoneyDisplay } from './MoneyDisplay';

interface TaxSummaryProps {
  taxName?: string;
  taxAmount: number;
  currency?: string;
}

export function TaxSummary({ taxName = 'Tax', taxAmount, currency }: TaxSummaryProps) {
  if (taxAmount <= 0) return null;
  return (
    <div className="flex justify-between items-center text-sm text-muted-foreground">
      <span>{taxName}</span>
      <MoneyDisplay amount={taxAmount} currency={currency} />
    </div>
  );
}
