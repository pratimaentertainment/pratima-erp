 
 
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthRepository } from '@/repositories/auth.repository';

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

  return <DashboardShell>{children}</DashboardShell>;
}
