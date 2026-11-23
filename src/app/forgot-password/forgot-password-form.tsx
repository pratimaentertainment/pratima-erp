'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPasswordAction } from '@/actions/auth.actions';
import Link from 'next/link';

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

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotInput = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema) as any,
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotInput) => {
    setIsSubmitting(true);
    await forgotPasswordAction(data.email);
    setIsSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <p>If an account exists for that email, a password reset link has been sent (or logged to console during development).</p>
          <Button type="button" variant="outline" className="w-full" onClick={() => window.location.href = '/login'}>
            Return to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Send Reset Link'}
            </Button>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Back to login
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
