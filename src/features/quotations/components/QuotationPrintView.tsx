'use client';

import * as React from 'react';
import { PremiumQuotationDocument } from './PremiumQuotationDocument';

interface QuotationPrintViewProps {
  data: any;
}

export function QuotationPrintView({ data }: QuotationPrintViewProps) {
  return <PremiumQuotationDocument quotation={data} isPublic={false} />;
}
