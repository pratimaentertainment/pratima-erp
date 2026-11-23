import { CustomerService } from '@/services/customer.service';
import { notFound, redirect } from 'next/navigation';
import { Customer360Client } from './customer-360-client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const metadata = {
  title: 'Customer 360 | Pratima ERP',
  description: 'Comprehensive 360-degree profile, financial lifecycle, and event operations.',
};

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  const user = session?.user as any;

  if (!session?.user) {
    redirect('/login');
  }

  if (!user?.tenantId) {
    redirect('/settings/tenant');
  }

  const customer = await CustomerService.getCustomer360Profile(params.id, user.tenantId);

  if (!customer) {
    notFound();
  }

  // Fetch available active staff members for sub-event crew assignments
  const staffList = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      status: 'ACTIVE',
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      designation: true,
      skills: true,
      employmentType: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <Customer360Client
      customer={customer as any}
      staffList={staffList || []}
    />
  );
}
