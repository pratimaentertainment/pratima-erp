import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getUpcomingShootsAction } from '@/actions/shoot-logistics.actions';
import { ShootLogisticsWorkbench } from '@/components/features/operations/logistics/shoot-logistics-workbench';

export const metadata: Metadata = {
  title: 'Shoot Logistics & Crew Allocation | Pratima ERP',
  description:
    'Unified operations command center for shoot crew allocation, equipment conflict checking, and WhatsApp call sheet dispatch.',
};

export default async function OperationsDispatchPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  // Fetch upcoming confirmed shoots with logistics metadata
  const shootsResult = await getUpcomingShootsAction();
  const initialShoots = shootsResult.success && shootsResult.data ? shootsResult.data : [];

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 max-w-7xl">
      <ShootLogisticsWorkbench initialShoots={initialShoots} />
    </div>
  );
}
