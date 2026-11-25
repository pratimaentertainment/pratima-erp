import { SetupService } from '@/services/setup.service';
import { redirect } from 'next/navigation';
import { SetupForm } from './setup-form';

export const metadata = {
  title: 'Setup | FRAMIQ by Pratima Entertainment & Technology',
};

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  // Check if system is initialized. If yes, this route is permanently locked.
  // Using try/catch to handle cases where the DB connection fails during build.
  let isInitialized = false;
  try {
    isInitialized = await SetupService.isSystemInitialized();
  } catch (error) {
    // If DB is unreachable during build or run, we assume not initialized
    // However, if the DB is truly unreachable, the setup form will fail to submit anyway.
  }

  if (isInitialized) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">System Setup</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to FRAMIQ. Please configure your headquarters and first super admin user.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
