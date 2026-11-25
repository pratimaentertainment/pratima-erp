'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  publicSignupSchema,
  PublicSignupInput,
} from '@/schemas/auth.schema';
import { registerPublicStudioAction } from '@/actions/public-auth.actions';
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
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<PublicSignupInput>({
    resolver: zodResolver(publicSignupSchema) as any,
    defaultValues: {
      studioName: '',
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

  // Preserve and restore referral code across visits/pages
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

  const onSubmit = (data: PublicSignupInput) => {
    startTransition(async () => {
      try {
        const res = await registerPublicStudioAction(data);
        if (res.success) {
          toast.success(res.message || 'Studio registered successfully. Please log in.');
          router.push('/login');
        } else {
          toast.error(res.error || 'Failed to register studio. Please check your details.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred while registering your studio.');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Selected Plan Callout Banner */}
        {initialPlanName && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground">
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

        {/* Studio Name */}
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
                    placeholder="e.g., Royal Wedding Studio"
                    className="pl-9 h-9 text-sm"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Owner Full Name */}
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-foreground">
                Owner Full Name
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
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Email Address */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-foreground">
                Email Address
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="vikram@royalwedding.com"
                    className="pl-9 h-9 text-sm"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Mobile Number */}
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
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-foreground">
                Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password (min 6 chars)"
                    className="pl-9 pr-10 h-9 text-sm"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
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
              <FormMessage className="text-xs" />
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
              <span>Creating your studio...</span>
            </>
          ) : (
            <>
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {/* Already have a studio link */}
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
  );
}
