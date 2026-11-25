'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Mail,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as z from 'zod';
import {
  registerStudioSchema,
  type RegisterStudioInput,
} from '@/schemas/tenant.schema';
import { registerStudioAction } from '@/actions/super-admin.actions';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface RegisterStudioFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RegisterStudioForm({ onSuccess, onCancel }: RegisterStudioFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registeredData, setRegisteredData] = React.useState<{
    name: string;
    slug: string;
    ownerEmail: string;
    contactPhone: string;
    temporaryPassword: string;
    accountType?: 'TRIAL' | 'INTERNAL_LIFETIME';
    subscriptionStatus?: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<RegisterStudioInput>({
    resolver: zodResolver(registerStudioSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      contactPhone: '',
      panNumber: '',
      accountType: 'TRIAL',
    },
  });

  const onSubmit = async (values: RegisterStudioInput) => {
    setIsSubmitting(true);
    try {
      const res = await registerStudioAction(values);
      if (res.success && res.data) {
        toast.success(`Studio "${res.data.name}" successfully registered!`);
        setRegisteredData(res.data);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to register studio. Please check details.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!registeredData) return;
    const text = `FRAMIQ Studio Credentials\nStudio: ${registeredData.name}\nSlug: ${registeredData.slug}\nEmail: ${registeredData.ownerEmail}\nTemp Password: ${registeredData.temporaryPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (registeredData) {
    const isLifetime = registeredData.accountType === 'INTERNAL_LIFETIME';
    return (
      <div className="space-y-5 py-2">
        <div className={cn(
          "rounded-xl border p-4",
          isLifetime
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-primary/20 bg-primary/10 text-primary"
        )}>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Studio Registered Successfully</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isLifetime
              ? 'Provisioned with permanent Internal Lifetime Enterprise access (trial bypassed, no billing required).'
              : 'A 15-day trial period has been initiated with full enterprise features.'}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">Studio Name</span>
            <span className="font-semibold text-foreground">{registeredData.name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">Account Tier</span>
            <span className={cn(
              "font-semibold text-xs px-2 py-0.5 rounded-full border",
              isLifetime
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
            )}>
              {isLifetime ? 'Internal Lifetime' : '15-Day Free Trial'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">URL Slug</span>
            <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">/{registeredData.slug}</code>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">Owner Email</span>
            <span className="font-medium text-foreground">{registeredData.ownerEmail}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">Contact Phone</span>
            <span className="font-medium text-foreground">{registeredData.contactPhone}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Temporary Password</span>
            <code className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
              {registeredData.temporaryPassword}
            </code>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCredentials}
            className="gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Credentials'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSuccess?.();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Account Type Selection */}
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-semibold">Account Tier & Licensing</FormLabel>
              <FormControl>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => field.onChange('TRIAL')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        field.onChange('TRIAL');
                      }
                    }}
                    className={cn(
                      'flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-left select-none',
                      field.value === 'TRIAL'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/70 hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-foreground">15-Day Free Trial</span>
                      </div>
                      <div
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                          field.value === 'TRIAL'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40'
                        )}
                      >
                        {field.value === 'TRIAL' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Standard evaluation for client studios. Requires plan upgrade after 15 days.
                    </p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => field.onChange('INTERNAL_LIFETIME')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        field.onChange('INTERNAL_LIFETIME');
                      }
                    }}
                    className={cn(
                      'flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-left select-none',
                      field.value === 'INTERNAL_LIFETIME'
                        ? 'border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600 dark:border-emerald-500'
                        : 'border-border/70 hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-foreground">Lifetime Access</span>
                      </div>
                      <div
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                          field.value === 'INTERNAL_LIFETIME'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-muted-foreground/40'
                        )}
                      >
                        {field.value === 'INTERNAL_LIFETIME' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      For internal company studios. Never expires and bypasses all subscription billing.
                    </p>
                  </div>
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Studio Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Studio Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder="e.g., Royal Wedding Studio" className="pl-9 h-9 text-sm" {...field} />
                </div>
              </FormControl>
              <FormDescription className="text-[11px]">
                The commercial brand name for the photography business.
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Owner Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Owner Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="owner@studio.com"
                    className="pl-9 h-9 text-sm"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-[11px]">
                Will be provisioned with Tenant Owner administrative access.
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Mobile Number (Anti-Abuse) */}
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">
                Mobile Number <span className="text-primary">*</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="+91 98765 43210"
                    className="pl-9 h-9 text-sm"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-[11px]">
                Enforces single-tenant verification and prevents trial abuse.
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* PAN Number (Optional Anti-Abuse) */}
        <FormField
          control={form.control}
          name="panNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">
                Permanent Account Number (PAN) <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="ABCDE1234F"
                    className="pl-9 h-9 text-sm uppercase"
                    maxLength={10}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-[11px]">
                Unique entity tax identifier for B2B billing and fraud protection.
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2 min-w-[140px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Create Studio'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
