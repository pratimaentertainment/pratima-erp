import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthRepository } from '@/repositories/auth.repository';
import { SecuritySettings } from './security-settings';

export const metadata = {
  title: 'Security Settings - Pratima ERP',
};

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id as string;
  const currentSessionId = (session.user as any).sessionId as string;
  const tenantId = (session.user as { tenantId?: string }).tenantId as string;

  // Fetch active sessions
  const activeSessions = await AuthRepository.findActiveSessionsForUser(userId);
  const loginHistory = await AuthRepository.findLoginHistoryForUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage your password and active sessions.
        </p>
      </div>
      <SecuritySettings 
        userId={userId} 
        tenantId={tenantId}
        currentSessionId={currentSessionId}
        sessions={activeSessions} 
        loginHistory={loginHistory}
      />
    </div>
  );
}
