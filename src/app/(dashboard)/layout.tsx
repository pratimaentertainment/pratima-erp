import { DashboardShell } from '@/components/layout/dashboard-shell';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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

  // Validate the session exists and is active in DB, hydrate context, and load broadcast in parallel
  const sessionId = (session.user as any).sessionId;
  const [dbSession, contextResult, broadcast] = await Promise.all([
    sessionId ? AuthRepository.findSessionById(sessionId) : Promise.resolve(null),
    getActiveContext().catch((error: any) => {
      if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith?.('NEXT_REDIRECT')) {
        throw error;
      }
      return null;
    }),
    getActivePlatformBroadcast(),
  ]);

  if (sessionId && (!dbSession || dbSession.status !== 'ACTIVE')) {
    redirect('/login?error=SessionExpired');
  }

  if ((session.user as any)?.role === 'DEALER') {
    redirect('/dealer');
  }

  if (!contextResult) {
    redirect('/login?error=SessionRequired');
  }
  const context = contextResult;

  // Mandatory Password Reset Enforcement: If temporary password is active, redirect to /profile/security
  const reqHeaders = await headers();
  const currentPath = reqHeaders.get('x-pathname') || '';
  
  // Verify against the fresh database user record from context, falling back to session only if context user is absent
  const dbMustChange = context.user?.mustChangePassword;
  const sessionMustChange = (session.user as any)?.mustChangePassword;
  const mustChangePassword = typeof dbMustChange === 'boolean'
    ? dbMustChange
    : Boolean(sessionMustChange);

  if (mustChangePassword && !currentPath.startsWith('/profile/security')) {
    redirect('/profile/security?forced=true');
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

  // broadcast was already fetched concurrently with context and session validation

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
