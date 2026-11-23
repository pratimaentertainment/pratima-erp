'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Sparkles,
  IndianRupee,
  GitBranch,
  Users,
  MessageSquare,
  PhoneCall,
  Loader2,
  CheckCircle2,
  Network,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  createPlanSchema,
  type CreatePlanInput,
} from '@/schemas/subscription.schema';
import { createSubscriptionPlanAction } from '@/actions/subscription.actions';
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

interface CreatePlanFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreatePlanForm({ onSuccess, onCancel }: CreatePlanFormProps) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema) as any,
    defaultValues: {
      name: '',
      slug: '',
      monthlyPrice: '' as unknown as number,
      annualPrice: '' as unknown as number,
      maxBranches: 1,
      maxStaff: 3,
      smsCredits: 100,
      whatsappCredits: 500,
      allowFranchises: false,
      perFranchiseMonthlyPrice: 0,
      perFranchiseAnnualPrice: 0,
      isActive: true,
    },
  });

  // Auto-generate slug when name changes if slug has not been manually customized
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const val = e.target.value;
    onChange(val);

    const currentSlug = form.getValues('slug');
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Auto-populate slug if empty or previously auto-generated
    if (!currentSlug || currentSlug === autoSlug.slice(0, -1)) {
      form.setValue('slug', autoSlug, { shouldValidate: true });
    }
  };

  const onSubmit = (data: CreatePlanInput) => {
    startTransition(async () => {
      try {
        const res = await createSubscriptionPlanAction(data);
        if (res.success) {
          toast.success(res.message || 'Subscription plan created successfully.');
          form.reset();
          onSuccess?.();
        } else {
          toast.error(res.error || 'Failed to create subscription plan.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tier Name & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">
                  Plan Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Studio Growth"
                    className="h-9 text-sm"
                    {...field}
                    onChange={(e) => handleNameChange(e, field.onChange)}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">
                  Unique Slug *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., studio-growth"
                    className="h-9 text-sm font-mono text-xs"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* Pricing: Monthly & Annual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
          <FormField
            control={form.control}
            name="monthlyPrice"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-primary" />
                  <span>Monthly Price (₹) *</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2499"
                    min="0"
                    step="1"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="annualPrice"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-emerald-500" />
                  <span>Annual Price (₹/yr) *</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 24999"
                    min="0"
                    step="1"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* Quotas: Max Branches & Max Staff */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="maxBranches"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                  <span>Max Branches *</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1"
                    min="1"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxStaff"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span>Max Staff Accounts *</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="3"
                    min="1"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* Credits: SMS & WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="smsCredits"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span>Free SMS Credits</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsappCredits"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <PhoneCall className="h-3 w-3 text-emerald-500" />
                  <span>Free WhatsApp Credits</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* Franchising & Flexi-Billing Tier Options */}
        <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-3">
          <FormField
            control={form.control}
            name="allowFranchises"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-primary" />
                    <span>Enable Franchise Network & Flexi-Billing</span>
                  </FormLabel>
                  <p className="text-[11px] text-muted-foreground">
                    Allow studios on this plan to provision linked franchisee studios.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch('allowFranchises') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <FormField
                control={form.control}
                name="perFranchiseMonthlyPrice"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-foreground flex items-center gap-1">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <span>Add-on Per Franchise (Monthly)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="h-9 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="perFranchiseAnnualPrice"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-foreground flex items-center gap-1">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <span>Add-on Per Franchise (Annual)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="h-9 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={onCancel}
              className="text-xs"
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="text-xs gap-2 font-semibold shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating Plan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Plan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
