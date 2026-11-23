import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardClient } from './dashboard-client';
import { BillingBanner } from '@/components/dashboard/billing-banner';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as any;
  if (user?.role === 'SUPER_ADMIN' && !user?.tenantId) {
    redirect('/super-admin');
  }

  const sessionContext = await DashboardService.validateSession();

  if (!sessionContext.tenantId && !sessionContext.isSuperAdmin) {
    redirect('/settings/tenant');
  }

  const [metrics, followUpMetrics, tenant] = await Promise.all([
    DashboardService.getOwnerDashboardMetrics(sessionContext),
    DashboardService.getMetrics({ tenantId: sessionContext.tenantId }),
    sessionContext.tenantId
      ? prisma.tenant.findUnique({
          where: { id: sessionContext.tenantId },
          select: { name: true, tradeName: true, companyLegalName: true },
        })
      : null,
  ]);

  if (!tenant && !sessionContext.isSuperAdmin) {
    redirect('/settings/tenant');
  }

  const studioName =
    tenant?.tradeName || tenant?.companyLegalName || tenant?.name || 'Pratima Photography Studio';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <BillingBanner />
      <DashboardClient
        metrics={metrics}
        followUpMetrics={followUpMetrics}
        userName={session.user.name || undefined}
        studioName={studioName}
        isExecutive={sessionContext.isExecutive}
      />
    </div>
  );
}
