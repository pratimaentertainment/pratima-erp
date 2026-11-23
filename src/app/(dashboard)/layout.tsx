import { DashboardShell } from '@/components/layout/dashboard-shell';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthRepository } from '@/repositories/auth.repository';
import { getActiveContext } from '@/lib/context';
import { AppContextProvider } from '@/providers/app-context';
import { AutoLogoutProvider } from '@/components/providers/auto-logout-provider';
import { TenantSplashScreen } from '@/components/layout/tenant-splash-screen';
import { checkTenantLockStatus } from '@/services/billing/subscription-guard.service';
import { SubscriptionLockScreen } from '@/components/billing/subscription-lock-screen';
import { getActivePlatformBroadcast } from '@/actions/super-admin-governance.actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Validate the session exists and is active in DB
  const sessionId = (session.user as any).sessionId;
  if (sessionId) {
    const dbSession = await AuthRepository.findSessionById(sessionId);
    if (!dbSession || dbSession.status !== 'ACTIVE') {
      // Session revoked or expired
      redirect('/login?error=SessionExpired');
    }
  }

  let context = null;
  try {
    context = await getActiveContext();
    if (!context) {
      redirect('/login?error=SessionRequired');
    }
  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith?.('NEXT_REDIRECT')) {
      throw error;
    }
    redirect('/login?error=SessionRequired');
  }

  // Hard Lock Check (Phase 13.3): Evaluate Tenant Subscription & Trial Status
  // Super Admin role is exempt from tenant locks
  const isSuperAdmin =
    context.user?.role === 'SUPER_ADMIN' ||
    context.user?.roles?.includes('SUPER_ADMIN');

  if (context.tenantId && !isSuperAdmin) {
    const lockStatus = await checkTenantLockStatus(context.tenantId);

    if (lockStatus.isLocked) {
      return (
        <SubscriptionLockScreen
          tenantId={context.tenantId}
          tenantName={context.tenant?.name || 'Studio'}
          reason={lockStatus.reason}
          daysLeft={lockStatus.daysLeft}
          userEmail={context.user?.email}
          userName={context.user?.name}
        />
      );
    }
  }

  const broadcast = await getActivePlatformBroadcast();

  return (
    <AppContextProvider initialContext={context}>
      <AutoLogoutProvider>
        <TenantSplashScreen tenant={context?.tenant}>
          <DashboardShell context={context} broadcast={broadcast}>{children}</DashboardShell>
        </TenantSplashScreen>
      </AutoLogoutProvider>
    </AppContextProvider>
  );
}
