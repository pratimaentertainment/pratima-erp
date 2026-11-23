import * as React from 'react';
import { Badge } from '@/components/badges/Badge';
import { getQuotationStatusColor, getQuotationStatusLabel } from '../utils';
import type { QuotationStatus } from '../constants';

export function QuotationStatusBadge({ status, className }: { status: QuotationStatus; className?: string }) {
  return (
    <Badge variant={getQuotationStatusColor(status)} className={className}>
      {getQuotationStatusLabel(status)}
    </Badge>
  );
}
