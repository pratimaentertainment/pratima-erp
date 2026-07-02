import { LoginForm } from './login-form';
import { Suspense } from 'react';

export const metadata = {
  title: 'Login - Pratima ERP',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Pratima ERP</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
