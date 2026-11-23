import * as React from 'react';
import { FileText } from 'lucide-react';
import type { EntityConfig } from '@/components/crud/types';
import type { QuotationDto } from '../types';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';

import { formatMoney } from '@/lib/currency';

export const QuotationEntityConfig: EntityConfig<QuotationDto> = {
  id: 'quotations',
  title: 'Quotations',
  singular: 'Quotation',
  plural: 'Quotations',
  icon: React.createElement(FileText, { className: 'h-4 w-4' }),
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  searchPlaceholder: 'Search by Quote Number or Customer...',
  defaultColumns: [
    {
      accessorKey: 'quoteNumber',
      header: 'Quote Number',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('quoteNumber')}</span>,
      meta: { mobileLabel: 'Number' },
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      meta: { mobileLabel: 'Customer' },
    },
    {
      accessorKey: 'issueDate',
      header: 'Issue Date',
      cell: ({ row }) => new Date(row.getValue('issueDate')).toLocaleDateString('en-IN'),
      meta: { mobileLabel: 'Issued' },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <QuotationStatusBadge status={row.getValue('status')} />,
      meta: { mobileLabel: 'Status' },
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('grandTotal'));
        return <div className="font-medium text-right font-mono">{formatMoney(amount, 'INR')}</div>;
      },
      meta: { mobileLabel: 'Total' },
    },
  ],
  defaultFilters: [
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Sent', value: 'SENT' },
        { label: 'Viewed', value: 'VIEWED' },
        { label: 'Negotiation', value: 'NEGOTIATION' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Expired', value: 'EXPIRED' },
        { label: 'Converted', value: 'CONVERTED' },
      ],
    },
  ],
};
