'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginAction } from '@/actions/auth.actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const urlMessage = searchParams.get('message');
  const urlError = searchParams.get('error');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Capture URL query errors (e.g., redirected from NextAuth proxy)
  React.useEffect(() => {
    if (urlError) {
      if (urlError === 'CredentialsSignin') {
        setErrorMsg('Invalid email or password.');
      } else if (urlError === 'SessionRequired') {
        setErrorMsg('Please sign in to access that page.');
      } else if (urlError === 'InactivityTimeout') {
        setErrorMsg('You have been logged out due to 30 minutes of inactivity. Please sign in again.');
      } else {
        setErrorMsg('Authentication session expired or invalid. Please sign in again.');
      }
    }
  }, [urlError]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pratima_splash_seen');
        sessionStorage.removeItem('pratima_tenant_splash_seen');
        sessionStorage.removeItem('pratima_superadmin_splash_seen');
      }

      const destination = searchParams.get('callbackUrl') || '/dashboard';

      const formData = new FormData();
      formData.append('email', data.email.trim());
      formData.append('password', data.password);
      formData.append('remember', data.remember ? 'true' : 'false');
      formData.append('redirectTo', destination);

      const res = await loginAction(formData);

      if (res?.error) {
        setErrorMsg(res.error);
        toast.error(res.error);
        setIsSubmitting(false);
      }
      // If login succeeded, loginAction re-throws NEXT_REDIRECT natively,
      // enabling Next.js to attach session cookies and perform browser navigation automatically.
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith?.('NEXT_REDIRECT')) {
        // Native Next.js redirect in flight; keep loading spinner active
        return;
      }
      console.error('Login submission error:', err);
      const errorText = err?.message || 'A network or server error occurred. Please try again.';
      setErrorMsg(errorText);
      toast.error(errorText);
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-border/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        {urlMessage && (
          <div className="bg-primary/10 text-primary border border-primary/20 p-3 rounded-md text-sm mb-4">
            {urlMessage}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 bg-destructive/15 text-destructive border border-destructive/30 p-3 rounded-md text-sm mb-4 font-medium animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="admin@pratima.com"
                      type="email"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-1">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer select-none">
                      Remember me
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
