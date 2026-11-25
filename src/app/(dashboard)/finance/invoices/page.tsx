import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import { InvoicesClient } from './invoices-client';
import { AccountType } from '@prisma/client';
import { AccountingService } from '@/services/accounting.service';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Accounts Receivable & Invoicing Workbench | FRAMIQ',
  description: 'Enterprise Invoicing, Accounts Receivable Aging, and Statutory GST Register.',
};

interface InvoicesPageProps {
  searchParams?: Promise<{ page?: string; pageSize?: string }>;
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-card space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="border rounded-xl bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border-b last:border-b-0">
              <div className="space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function InvoicesDataLoader({
  tenantId,
  pageSize,
  skip,
}: {
  tenantId: string;
  pageSize: number;
  skip: number;
}) {
  const [tenant, invoices, rawSourceAccounts] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        isGstRegistered: true,
        gstNumber: true,
        state: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      take: pageSize,
      skip,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            email: true,
            gstin: true,
          },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { paymentDate: 'desc' },
        },
        creditNotes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        quotation: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
        items: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.account.findMany({
      where: {
        tenantId,
        deletedAt: null,
        type: AccountType.ASSET,
        OR: [
          { code: { in: ['1010', '1020', '1030'] } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    }),
  ]);

  let sourceAccounts = rawSourceAccounts;
  if (sourceAccounts.length === 0) {
    await AccountingService.initializeDefaultAccounts(tenantId);
    sourceAccounts = await prisma.account.findMany({
      where: {
        tenantId,
        deletedAt: null,
        type: AccountType.ASSET,
        OR: [
          { code: { in: ['1010', '1020', '1030'] } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, code: true, type: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  return (
    <InvoicesClient
      initialInvoices={serializePrisma(invoices)}
      tenantInfo={serializePrisma(tenant)}
      sourceAccounts={serializePrisma(sourceAccounts)}
    />
  );
}

export default async function InvoicesPage(props: InvoicesPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(searchParams?.pageSize) || 50), 100);
  const skip = (page - 1) * pageSize;

  const session = await auth();
  const user = session?.user as { tenantId?: string; id?: string } | undefined;

  if (!user?.tenantId) {
    redirect('/login');
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Suspense fallback={<InvoicesSkeleton />}>
        <InvoicesDataLoader tenantId={user.tenantId} pageSize={pageSize} skip={skip} />
      </Suspense>
    </div>
  );
}
