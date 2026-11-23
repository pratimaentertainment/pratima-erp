'use client';

import * as React from 'react';
import { QuotationForm } from '@/features/quotations/components/QuotationForm';

export interface PackageOption {
  id: string;
  name: string;
  packageCode: string;
  basePrice: number | string;
  description?: string | null;
}

export interface LeadSummary {
  id: string;
  leadCode: string;
  tenantId?: string;
  branchId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  status: string;
  budgetRange?: string | null;
}

export interface QuotationCreateFormProps {
  lead: LeadSummary;
  packages?: PackageOption[];
  onSuccess?: (quotation: any) => void;
}

export function QuotationCreateForm({ lead, packages = [], onSuccess }: QuotationCreateFormProps) {
  return (
    <QuotationForm
      lead={{
        id: lead.id,
        leadCode: lead.leadCode,
        tenantId: lead.tenantId,
        branchId: lead.branchId,
        customerId: lead.customerId,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        customerEmail: lead.customerEmail,
        status: lead.status,
        budgetRange: lead.budgetRange,
      }}
      packages={packages}
      onSuccess={onSuccess}
    />
  );
}

export default QuotationCreateForm;
