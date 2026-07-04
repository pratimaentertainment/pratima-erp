 
 
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthRepository } from '@/repositories/auth.repository';
import { getActiveContext } from '@/lib/context';

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
      redirect('/api/auth/signout?callbackUrl=/login');
    }
  }

  const context = await getActiveContext();

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
