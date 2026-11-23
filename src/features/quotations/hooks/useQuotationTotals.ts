import * as React from 'react';
import { calculateQuotationTotals } from '../utils';

export function useQuotationTotals(items: { quantity: number; unitPrice: number; discount: number; tax: number }[]) {
  return React.useMemo(() => calculateQuotationTotals(items), [items]);
}
