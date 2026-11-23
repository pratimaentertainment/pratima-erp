import * as React from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { TaxSummary } from './TaxSummary';
import { DiscountSummary } from './DiscountSummary';

interface PricingSummaryProps {
  subtotal: number;
  totalDiscount?: number;
  totalTax?: number;
  grandTotal: number;
  currency?: string;
}

export function PricingSummary({ subtotal, totalDiscount = 0, totalTax = 0, grandTotal, currency }: PricingSummaryProps) {
  return (
    <div className="w-full max-w-sm ml-auto space-y-3">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Subtotal</span>
        <MoneyDisplay amount={subtotal} currency={currency} />
      </div>
      <DiscountSummary discountAmount={totalDiscount} currency={currency} />
      <TaxSummary taxAmount={totalTax} currency={currency} />
      <div className="flex justify-between items-center font-bold text-base pt-3 border-t border-border">
        <span>Total</span>
        <MoneyDisplay amount={grandTotal} currency={currency} className="text-xl" />
      </div>
    </div>
  );
}
