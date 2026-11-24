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
  Loader2,
  CheckCircle2,
  Network,
  Check,
  Layers,
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
import { Badge } from '@/components/ui/badge';
import {
  PLAN_FEATURES_CATALOG,
  PlanFeatureKey,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';

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
      features: [...PRO_DEFAULT_FEATURES],
      smsCredits: 0,
      whatsappCredits: 0,
      allowFranchises: false,
      perFranchiseMonthlyPrice: 0,
      perFranchiseAnnualPrice: 0,
      isActive: true,
    },
  });

  const selectedFeatures = form.watch('features') || [];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const val = e.target.value;
    onChange(val);

    const currentSlug = form.getValues('slug');
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!currentSlug || currentSlug === autoSlug.slice(0, -1)) {
      form.setValue('slug', autoSlug, { shouldValidate: true });
    }
  };

  const toggleFeature = (featureKey: PlanFeatureKey) => {
    const current = form.getValues('features') || [];
    let updated: string[];
    if (current.includes(featureKey)) {
      updated = current.filter((k) => k !== featureKey);
      if (featureKey === 'FRANCHISE_NETWORK') {
        form.setValue('allowFranchises', false);
      }
    } else {
      updated = [...current, featureKey];
      if (featureKey === 'FRANCHISE_NETWORK') {
        form.setValue('allowFranchises', true);
      }
    }
    form.setValue('features', updated, { shouldValidate: true });
  };

  const applyPreset = (preset: 'starter' | 'pro' | 'enterprise') => {
    if (preset === 'starter') {
      form.setValue('features', [...STARTER_DEFAULT_FEATURES]);
      form.setValue('allowFranchises', false);
      form.setValue('maxBranches', 1);
      form.setValue('maxStaff', 3);
    } else if (preset === 'pro') {
      form.setValue('features', [...PRO_DEFAULT_FEATURES]);
      form.setValue('allowFranchises', false);
      form.setValue('maxBranches', 3);
      form.setValue('maxStaff', 10);
    } else {
      form.setValue('features', [...ENTERPRISE_DEFAULT_FEATURES]);
      form.setValue('allowFranchises', true);
      form.setValue('maxBranches', 10);
      form.setValue('maxStaff', 50);
      form.setValue('perFranchiseMonthlyPrice', 999);
      form.setValue('perFranchiseAnnualPrice', 9990);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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
                  <span>Max Branches Allowed *</span>
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

        {/* Feature Matrix & Add-ons Grid */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Included Features &amp; Add-ons ({selectedFeatures.length}/{PLAN_FEATURES_CATALOG.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 text-[10px] px-2"
                onClick={() => applyPreset('starter')}
              >
                Starter
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 text-[10px] px-2"
                onClick={() => applyPreset('pro')}
              >
                Pro
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 text-[10px] px-2"
                onClick={() => applyPreset('enterprise')}
              >
                Enterprise
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border/70 rounded-lg p-2.5 bg-muted/20">
            {PLAN_FEATURES_CATALOG.map((f) => {
              const isSelected = selectedFeatures.includes(f.key);
              return (
                <div
                  key={f.key}
                  onClick={() => toggleFeature(f.key)}
                  className={`flex items-start gap-2.5 p-2 rounded-md border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary/40 text-foreground'
                      : 'bg-card/40 border-border/50 text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-background'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate leading-tight">
                      {f.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {f.shortDescription}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                    <span>Enable Franchise Network &amp; Flexi-Billing</span>
                  </FormLabel>
                  <p className="text-[11px] text-muted-foreground">
                    Allow studios on this plan to provision linked franchisee studios.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        const cur = form.getValues('features') || [];
                        if (!cur.includes('FRANCHISE_NETWORK')) {
                          form.setValue('features', [...cur, 'FRANCHISE_NETWORK']);
                        }
                      }
                    }}
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
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
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
