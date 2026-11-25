import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCentralizedFollowUpsAction } from '@/actions/follow-up-dashboard.actions';
import { FollowUpClient } from './follow-up-client';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Sales Follow-up & Task Dashboard | FRAMIQ',
  description: 'Centralized queue for sales follow-ups, calls, WhatsApp touches, and scheduled tasks.',
};

export default async function FollowUpsDashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const result = await getCentralizedFollowUpsAction();

  const initialData = result.success && result.data
    ? result.data
    : {
        overdue: [],
        today: [],
        upcoming: [],
        completed: [],
        stats: {
          totalPending: 0,
          overdueCount: 0,
          todayCount: 0,
          upcomingCount: 0,
          completedCount: 0,
        },
      };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/operations"
            className="p-2 border rounded-lg hover:bg-accent transition-colors"
            title="Back to Operations"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Sales Follow-Up & Task Queue
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Centralized daily execution pipeline: Overdue alerts, today&apos;s scheduled calls, and upcoming prospect touches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5">
              <span>View All Leads</span>
            </Button>
          </Link>
        </div>
      </div>

      <FollowUpClient initialData={initialData} />
    </div>
  );
}
