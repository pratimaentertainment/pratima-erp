import { ForgotPasswordForm } from './forgot-password-form';
import { Suspense } from 'react';

export const metadata = {
  title: 'Forgot Password | FRAMIQ by Pratima Entertainment & Technology',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-muted-foreground mt-2">Enter your email to reset your password</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
