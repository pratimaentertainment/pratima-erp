import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getIngestionDeskDataAction } from '@/actions/data-ingestion.actions';
import { DataIngestionDesk } from '@/components/features/operations/ingestion/data-ingestion-desk';

export const metadata: Metadata = {
  title: 'Post-Shoot Data Ingestion & Payout Bridge | Pratima ERP',
  description:
    'Studio media intake desk, checksum verification queue, and automated freelancer finance liability authorization.',
};

export default async function DataIngestionPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const res = await getIngestionDeskDataAction();
  const initialData = res.success && res.data ? res.data : { bookings: [], jobs: [], teamMembers: [] };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 max-w-7xl">
      <DataIngestionDesk initialData={initialData} />
    </div>
  );
}
