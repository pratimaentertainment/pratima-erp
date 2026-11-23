import { QUOTATION_STATUS_COLORS, QUOTATION_STATUS_LABELS, type QuotationStatus } from '../constants';

export function getQuotationStatusColor(status: QuotationStatus) {
  return QUOTATION_STATUS_COLORS[status] || 'neutral';
}

export function getQuotationStatusLabel(status: QuotationStatus) {
  return QUOTATION_STATUS_LABELS[status] || status;
}

export function calculateQuotationTotals(items: { quantity: number; unitPrice: number; discount: number; tax: number }[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  items.forEach(item => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount;
    const taxableAmount = itemSubtotal - itemDiscount;
    const itemTax = item.tax;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
  });

  return {
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal: subtotal - totalDiscount + totalTax,
  };
}

export function generateQuoteNumber(sequence: number): string {
  const prefix = 'QT';
  const year = new Date().getFullYear();
  const seqStr = sequence.toString().padStart(4, '0');
  return `${prefix}-${year}-${seqStr}`;
}
