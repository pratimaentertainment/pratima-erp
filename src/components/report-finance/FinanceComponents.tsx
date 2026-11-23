import * as React from 'react';
import { cn } from '@/lib/utils';

interface FinanceSummaryItemProps {
  label: string;
  value: string;
  isTotal?: boolean;
  className?: string;
}

export function FinanceSummaryItem({ label, value, isTotal, className }: FinanceSummaryItemProps) {
  return (
    <div className={cn("flex justify-between items-center py-1.5", isTotal && "border-t-2 border-b-2 py-3 font-bold text-lg my-2", className)}>
      <span className={cn("text-gray-600 text-sm", isTotal && "text-gray-900")}>{label}</span>
      <span className={cn("text-gray-900 font-medium", isTotal && "text-[var(--report-primary)]")}>{value}</span>
    </div>
  );
}

export function GrandTotal({ label = "Grand Total", value, className }: { label?: string, value: string, className?: string }) {
  return <FinanceSummaryItem label={label} value={value} isTotal className={className} />;
}

export function TaxSummary({ label = "Tax", value, className }: { label?: string, value: string, className?: string }) {
  return <FinanceSummaryItem label={label} value={value} className={className} />;
}

export function DiscountSummary({ label = "Discount", value, className }: { label?: string, value: string, className?: string }) {
  return <FinanceSummaryItem label={label} value={`-${value}`} className={cn("text-green-600", className)} />;
}

export function SubTotal({ label = "Subtotal", value, className }: { label?: string, value: string, className?: string }) {
  return <FinanceSummaryItem label={label} value={value} className={cn("font-semibold", className)} />;
}

// Stubs
export const TotalsCard = () => null;
export const PaymentSummary = () => null;
