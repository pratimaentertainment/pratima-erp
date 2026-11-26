'use client';

import * as React from 'react';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Tag,
  KeyRound,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  publicSignupSchema,
  PublicSignupInput,
} from '@/schemas/auth.schema';
import {
  requestSignupOtpAction,
  verifySignupOtpAndCreateStudioAction,
} from '@/actions/public-auth.actions';
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
import { Checkbox } from '@/components/ui/checkbox';

interface SignupFormProps {
  initialPlanId?: string;
  initialPlanName?: string;
  initialCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  initialRefCode?: string;
}

export function SignupForm({
  initialPlanId,
  initialPlanName,
  initialCycle = 'MONTHLY',
  initialRefCode,
}: SignupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');
  const [formData, setFormData] = useState<PublicSignupInput | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const form = useForm<PublicSignupInput>({
    resolver: zodResolver(publicSignupSchema) as any,
    defaultValues: {
      studioName: '',
      city: '',
      ownerName: '',
      email: '',
      mobileNumber: '',
      password: '',
      planId: initialPlanId || null,
      billingCycle: initialCycle,
      referralCode: initialRefCode?.toUpperCase() || '',
      termsAccepted: false as unknown as true,
    },
  });

  // Preserve and restore referral code across visits
  useEffect(() => {
    try {
      if (initialRefCode) {
        const normalized = initialRefCode.trim().toUpperCase();
        localStorage.setItem('pratima_ref_code', normalized);
        form.setValue('referralCode', normalized);
      } else {
        const stored = localStorage.getItem('pratima_ref_code');
        if (stored) {
          form.setValue('referralCode', stored.trim().toUpperCase());
        }
      }
    } catch {}
  }, [initialRefCode, form]);

  // Step 1: Submit Details & Request Pre-Trial Verification OTP
  const onRequestOtp = (data: PublicSignupInput) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await requestSignupOtpAction(data);
        if (res.success) {
          setFormData(data);
          setStep('OTP');
          setCooldown(60);
          toast.success(res.message || 'Verification code sent to your email.');
        } else {
          setErrorMessage(res.error || 'Failed to dispatch verification code.');
          toast.error(res.error || 'Failed to dispatch verification code.');
        }
      } catch (err: any) {
        const msg = err.message || 'Network exception while dispatching code.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    });
  };

  // Step 2: Resend OTP
  const handleResendOtp = () => {
    if (cooldown > 0 || !formData || isPending) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await requestSignupOtpAction(formData);
        if (res.success) {
          setCooldown(60);
          toast.success('A new 6-digit verification code has been sent.');
        } else {
          setErrorMessage(res.error || 'Failed to resend code.');
          toast.error(res.error || 'Failed to resend code.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not resend code.');
      }
    });
  };

  // Step 3: Verify OTP & Create Studio
  const onVerifyAndCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    if (otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await verifySignupOtpAndCreateStudioAction({
          ...formData,
          otp: otpCode.trim(),
        });

        if (res.success) {
          setStep('SUCCESS');
          toast.success(res.message || 'Studio registered successfully! Welcome to FRAMIQ.');
          setTimeout(() => {
            router.push('/login?registered=success');
          }, 2000);
        } else {
          setErrorMessage(res.error || 'Verification failed. Please check your code.');
          toast.error(res.error || 'Verification failed.');
        }
      } catch (err: any) {
        const msg = err.message || 'An unexpected error occurred while launching your studio.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div>
      {/* Plan Callout Banner */}
      {initialPlanName && step !== 'SUCCESS' && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{initialPlanName} Plan</span>
              <span className="text-muted-foreground block text-[11px]">
                15-Day Free Trial • {initialCycle === 'ANNUAL' ? 'Annual Billing' : 'Monthly Billing'}
              </span>
            </div>
          </div>
          <Link
            href="/pricing"
            className="text-[11px] font-semibold text-primary hover:underline underline-offset-2 shrink-0"
          >
            Change Plan
          </Link>
        </div>
      )}

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="leading-snug">{errorMessage}</p>
        </div>
      )}

      {/* STEP 1: INITIAL STUDIO & CITY DETAILS */}
      {step === 'FORM' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onRequestOtp)} className="space-y-3.5">
            {/* Studio Name & City Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="studioName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Studio / Brand Name
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="e.g., Royal Studio"
                          className="pl-9 h-9 text-sm"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      City / Town
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="e.g., Kolhapur, Pune"
                          className="pl-9 h-9 text-sm"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Owner Full Name */}
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    Studio Owner Full Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="e.g., Vikram Sharma"
                        className="pl-9 h-9 text-sm"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Email Address & Mobile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Business Email Address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="vikram@royalstudio.com"
                          className="pl-9 h-9 text-sm"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Mobile Number <span className="text-muted-foreground text-[10px] font-normal">(10 Digits)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground pointer-events-none select-none">
                          +91
                        </span>
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          className="pl-11 h-9 text-sm"
                          {...field}
                        />
                        <Phone className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    Account Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a confidential password (min 6 chars)"
                        className="pl-9 pr-10 h-9 text-sm"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Partner / Referral Code (Optional) */}
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Partner / Referral Code</span>
                    <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="e.g., DEALER10"
                        className="pl-9 h-9 text-sm uppercase font-mono tracking-wider"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          field.onChange(val);
                          if (val) {
                            try {
                              localStorage.setItem('pratima_ref_code', val);
                            } catch {}
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Terms & Conditions Checkbox */}
            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="space-y-1.5 pt-1">
                  <div className="flex items-start gap-2.5">
                    <FormControl>
                      <Checkbox
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="leading-snug">
                      <span className="text-xs text-muted-foreground select-none">
                        I agree to the{' '}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                        >
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </div>
                  </div>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 gap-2 font-medium shadow-xs text-sm mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying details...</span>
                </>
              ) : (
                <>
                  <span>Verify Email &amp; Start Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Already have a studio */}
            <div className="text-center pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Already have a studio?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
                >
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </Form>
      )}

      {/* STEP 2: PRE-TRIAL 6-DIGIT EMAIL OTP VERIFICATION */}
      {step === 'OTP' && (
        <form onSubmit={onVerifyAndCreate} className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-foreground">Verify Your Business Email</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              We sent a 6-digit security code to{' '}
              <strong className="text-foreground">{formData?.email}</strong> for studio{' '}
              <strong className="text-foreground">{formData?.studioName}</strong> ({formData?.city}).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex justify-between">
              <span>6-Digit Verification Code</span>
              <span className="text-[11px] text-muted-foreground font-normal">Valid for 10 minutes</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="123456"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-9 text-center font-mono text-xl tracking-[0.4em] font-bold h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || otpCode.length !== 6}
            className="w-full h-10 gap-2 font-medium shadow-xs text-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Launching your studio...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Confirm Code &amp; Launch Studio</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('FORM');
                setErrorMessage(null);
              }}
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Edit Studio Details
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || isPending}
              className="inline-flex items-center font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              <RotateCw className={`mr-1 h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SUCCESS TRANSITION */}
      {step === 'SUCCESS' && (
        <div className="py-8 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Welcome to FRAMIQ!</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Your studio <strong>{formData?.studioName}</strong> ({formData?.city}) has been registered and your 15-day free trial is now active.
          </p>
          <p className="text-[11px] text-muted-foreground">Redirecting you to sign in...</p>
        </div>
      )}
    </div>
  );
}
