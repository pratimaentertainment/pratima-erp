import * as React from 'react';
import { PricingSummary } from '@/components/finance';

interface LineItemTotalsProps {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  currency?: string;
}

export function LineItemTotals({ subtotal, totalDiscount, totalTax, grandTotal, currency = 'USD' }: LineItemTotalsProps) {
  return (
    <div className="mt-8 border-t pt-6">
      <PricingSummary
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        totalTax={totalTax}
        grandTotal={grandTotal}
        currency={currency}
      />
    </div>
  );
}
