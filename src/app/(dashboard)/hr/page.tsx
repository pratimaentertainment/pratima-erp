import * as React from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { HrPayrollClient } from './hr-payroll-client';
import {
  getDailyAttendance,
  getLeaveRequests,
  getMonthlyPayroll,
} from '@/actions/hr-payroll.actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'HR & In-House Payroll | Pratima ERP',
  description: 'Manage staff attendance, leave desk, and monthly salary disbursement.',
};

export default async function HrPayrollPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    redirect('/login');
  }

  const tenantId = user.tenantId as string;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Parallel data fetching for instant SSR load
  const [attendanceRes, leavesRes, payrollRes, tenant] = await Promise.all([
    getDailyAttendance(),
    getLeaveRequests(),
    getMonthlyPayroll(currentMonth, currentYear),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        logoUrl: true,
        contactPhone: true,
        gstNumber: true,
      },
    }),
  ]);

  const tenantBranding = {
    name: tenant?.name || 'Pratima Studio',
    tradeName: tenant?.tradeName || tenant?.name || 'Pratima Studio',
    logoUrl: tenant?.logoUrl || null,
    contactPhone: tenant?.contactPhone || null,
    gstNumber: tenant?.gstNumber || null,
  };

  return (
    <HrPayrollClient
      initialAttendance={attendanceRes.data || { date: now.toISOString().split('T')[0], stats: {}, roster: [] }}
      initialLeaves={leavesRes.data || []}
      initialPayroll={payrollRes.data || { month: currentMonth, year: currentYear, metrics: {}, records: [] }}
      tenant={tenantBranding}
    />
  );
}
