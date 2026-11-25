import { ResetPasswordForm } from './reset-password-form';
import { Suspense } from 'react';

export const metadata = {
  title: 'Reset Password | FRAMIQ by Pratima Entertainment & Technology',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground mt-2">Enter your new secure password</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
