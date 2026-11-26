'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

import {
  forgotPasswordRequestOtpAction,
  forgotPasswordVerifyOtpAction,
  forgotPasswordResetAction,
} from '@/actions/auth.actions';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Step 1 Schema: Email
const step1EmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type Step1EmailInput = z.infer<typeof step1EmailSchema>;

// Step 2 Schema: 6-Digit OTP
const step2OtpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Please enter all 6 digits')
    .regex(/^\d{6}$/, 'Code must contain numbers only'),
});
type Step2OtpInput = z.infer<typeof step2OtpSchema>;

// Step 3 Schema: New Password
const step3PasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type Step3PasswordInput = z.infer<typeof step3PasswordSchema>;

type ResetStep = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('EMAIL');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resetSessionToken, setResetSessionToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Resend cooldown timer in seconds
  const [cooldown, setCooldown] = useState(0);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Form instances for each step
  const emailForm = useForm<Step1EmailInput>({
    resolver: zodResolver(step1EmailSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<Step2OtpInput>({
    resolver: zodResolver(step2OtpSchema),
    defaultValues: { otp: '' },
  });

  const passwordForm = useForm<Step3PasswordInput>({
    resolver: zodResolver(step3PasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Step 1: Request OTP
  const onEmailSubmit = async (data: Step1EmailInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await forgotPasswordRequestOtpAction(data.email);
      if (res.success) {
        setEmail(data.email);
        setMaskedEmail(res.maskedEmail || data.email);
        setStep('OTP');
        setCooldown(60);
      } else {
        setErrorMessage(res.error || 'Failed to dispatch verification code.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || !email || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await forgotPasswordRequestOtpAction(email);
      if (res.success) {
        setCooldown(60);
      } else {
        setErrorMessage(res.error || 'Failed to resend code.');
      }
    } catch {
      setErrorMessage('Could not resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const onOtpSubmit = async (data: Step2OtpInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await forgotPasswordVerifyOtpAction(email, data.otp);
      if (res.success && res.resetSessionToken) {
        setResetSessionToken(res.resetSessionToken);
        setStep('PASSWORD');
      } else {
        setErrorMessage(res.error || 'Invalid or expired verification code.');
      }
    } catch {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Reset
  const onPasswordSubmit = async (data: Step3PasswordInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await forgotPasswordResetAction(resetSessionToken, data.password);
      if (res.success) {
        setStep('SUCCESS');
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 2500);
      } else {
        setErrorMessage(res.error || 'Failed to update password.');
      }
    } catch {
      setErrorMessage('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {step === 'EMAIL' && <Mail className="h-4 w-4" />}
            {step === 'OTP' && <KeyRound className="h-4 w-4" />}
            {step === 'PASSWORD' && <Lock className="h-4 w-4" />}
            {step === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {step === 'EMAIL' && 'Step 1 of 3: Identify Account'}
            {step === 'OTP' && 'Step 2 of 3: Security Code'}
            {step === 'PASSWORD' && 'Step 3 of 3: Set Password'}
            {step === 'SUCCESS' && 'Verified & Updated'}
          </span>
        </div>
        <CardTitle className="text-xl font-bold">
          {step === 'EMAIL' && 'Forgot your password?'}
          {step === 'OTP' && 'Enter Verification Code'}
          {step === 'PASSWORD' && 'Create New Password'}
          {step === 'SUCCESS' && 'Password Reset Complete'}
        </CardTitle>
        <CardDescription>
          {step === 'EMAIL' && "Enter your registered email address to receive a 6-digit security code."}
          {step === 'OTP' && `We sent a 6-digit verification code to ${maskedEmail || 'your email'}. Valid for 10 minutes.`}
          {step === 'PASSWORD' && 'Choose a strong new password that you have not used recently.'}
          {step === 'SUCCESS' && 'Your password has been securely updated. Redirecting to login...'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="leading-snug">{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'EMAIL' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="owner@yourstudio.com"
                          className="pl-9"
                          autoComplete="email"
                          autoFocus
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Send 6-Digit Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          </Form>
        )}

        {/* STEP 2: 6-DIGIT OTP */}
        {step === 'OTP' && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between items-center">
                      <span>6-Digit Verification Code</span>
                      <span className="text-xs text-muted-foreground font-normal">Check your inbox</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          autoFocus
                          className="pl-9 text-center font-mono text-xl tracking-[0.4em] font-bold"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            field.onChange(val);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify &amp; Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                  className="inline-flex items-center font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  <RotateCw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          </Form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === 'PASSWORD' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter strong password"
                          autoFocus
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password strength checklist */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground/80 mb-1.5">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <span className={passwordForm.watch('password')?.length >= 8 ? 'text-emerald-500 font-medium' : ''}>
                    ✓ At least 8 characters
                  </span>
                  <span className={/[A-Z]/.test(passwordForm.watch('password') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ uppercase letter
                  </span>
                  <span className={/[a-z]/.test(passwordForm.watch('password') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ lowercase letter
                  </span>
                  <span className={/[0-9]/.test(passwordForm.watch('password') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ number
                  </span>
                  <span className={/[^A-Za-z0-9]/.test(passwordForm.watch('password') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ special character
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving New Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Save New Password &amp; Log In
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Your password has been changed successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              All previous active sessions have been terminated for security. Redirecting you to sign in...
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login?reset=success')}
              >
                Go to Sign In Now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
