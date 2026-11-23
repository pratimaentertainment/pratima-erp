'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download, Printer } from 'lucide-react';
import { Button } from '@/components/buttons/Button';
import { EntityListPage } from '@/components/crud/EntityListPage';
import { useDataGrid } from '@/components/datagrid';
import { QuotationEntityConfig } from '../config';
import { QUOTATION_ROUTES } from '../navigation';
import { QUOTATION_PERMISSIONS } from '../permissions';
import type { QuotationDto } from '../types';

interface QuotationListViewProps {
  data: QuotationDto[];
  totalRows: number;
}

export function QuotationListView({ data, totalRows }: QuotationListViewProps) {
  const router = useRouter();

  const {
    table,
    globalFilter,
    rowSelection
  } = useDataGrid({
    data,
    totalRows,
    columns: QuotationEntityConfig.defaultColumns || [],
    enableRowSelection: true,
    syncUrlParams: true,
  });

  // Example stats calculation (should ideally come from server)
  const stats = [
    {
      id: 'total-quotes',
      title: 'Total Quotes',
      value: totalRows.toString(),
    },
    {
      id: 'pending-approval',
      title: 'Pending Approval',
      value: data.filter(q => q.status === 'SENT').length.toString(),
    },
    {
      id: 'converted',
      title: 'Converted',
      value: data.filter(q => q.status === 'CONVERTED').length.toString(),
    }
  ];

  return (
    <EntityListPage
      header={{
        title: QuotationEntityConfig.title,
        subtitle: 'Manage and track customer quotations',
        primaryAction: (
          <Button onClick={() => router.push(QUOTATION_ROUTES.CREATE)}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        ),
      }}
      stats={stats}
      toolbar={{
        exportAction: (
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        ),
        filters: QuotationEntityConfig.defaultFilters,
      }}
      table={table}
      globalFilter={globalFilter}
      setGlobalFilter={table.setGlobalFilter}
      rowActions={[
        {
          id: 'view',
          label: 'View Details',
          onClick: (row) => router.push(QUOTATION_ROUTES.DETAIL(row.id)),
        },
        {
          id: 'edit',
          label: 'Edit Draft',
          onClick: (row) => router.push(QUOTATION_ROUTES.EDIT(row.id)),
          show: (row) => row.status === 'DRAFT',
        },
        {
          id: 'print',
          label: 'Print PDF',
          icon: <Printer className="h-4 w-4" />,
          onClick: (row) => router.push(QUOTATION_ROUTES.PRINT(row.id)),
        },
        {
          id: 'delete',
          label: 'Delete',
          isDestructive: true,
          onClick: (row) => console.log('Delete', row.id), // Hooked up in Phase 6
        },
      ]}
    />
  );
}
