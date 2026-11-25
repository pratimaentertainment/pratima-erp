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
  Tag,
  ArrowUpDown,
  Flame,
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
      originalMonthlyPrice: null,
      monthlyPrice: '' as unknown as number,
      originalAnnualPrice: null,
      annualPrice: '' as unknown as number,
      offerBadgeText: '',
      isBasePlan: false,
      sortOrder: 0,
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
  const monthlyPriceWatch = Number(form.watch('monthlyPrice') || 0);
  const originalMonthlyWatch = Number(form.watch('originalMonthlyPrice') || 0);
  const annualPriceWatch = Number(form.watch('annualPrice') || 0);
  const originalAnnualWatch = Number(form.watch('originalAnnualPrice') || 0);
  const isBasePlanWatch = form.watch('isBasePlan');
  const offerBadgeWatch = form.watch('offerBadgeText');

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
      form.setValue('name', 'Starter Studio');
      form.setValue('slug', 'starter-studio');
      form.setValue('originalMonthlyPrice', 1499);
      form.setValue('monthlyPrice', 999);
      form.setValue('originalAnnualPrice', 14990);
      form.setValue('annualPrice', 9990);
      form.setValue('offerBadgeText', 'Base Plan');
      form.setValue('isBasePlan', true);
      form.setValue('sortOrder', 1);
      form.setValue('features', [...STARTER_DEFAULT_FEATURES]);
      form.setValue('allowFranchises', false);
      form.setValue('maxBranches', 1);
      form.setValue('maxStaff', 3);
    } else if (preset === 'pro') {
      form.setValue('name', 'Pro Studio');
      form.setValue('slug', 'pro-studio');
      form.setValue('originalMonthlyPrice', 3499);
      form.setValue('monthlyPrice', 2499);
      form.setValue('originalAnnualPrice', 34990);
      form.setValue('annualPrice', 24990);
      form.setValue('offerBadgeText', 'Most Popular');
      form.setValue('isBasePlan', false);
      form.setValue('sortOrder', 2);
      form.setValue('features', [...PRO_DEFAULT_FEATURES]);
      form.setValue('allowFranchises', false);
      form.setValue('maxBranches', 3);
      form.setValue('maxStaff', 10);
    } else {
      form.setValue('name', 'Enterprise Franchise');
      form.setValue('slug', 'enterprise-franchise');
      form.setValue('originalMonthlyPrice', 6999);
      form.setValue('monthlyPrice', 4999);
      form.setValue('originalAnnualPrice', 69990);
      form.setValue('annualPrice', 49990);
      form.setValue('offerBadgeText', 'Franchise Ready');
      form.setValue('isBasePlan', false);
      form.setValue('sortOrder', 3);
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

        {/* Pricing: MRP vs Offer (Monthly & Annual) */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-primary" />
              <span>Pricing &amp; Strikethrough MRP</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Crossed-out MRP creates buyer urgency
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="originalMonthlyPrice"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="line-through">Original Monthly Rate (MRP ₹)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 3499 (optional MRP)"
                      min="0"
                      step="1"
                      className="h-9 text-sm font-mono"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyPrice"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-primary" />
                    <span>Active Offer Monthly Price (₹) *</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2499"
                      min="0"
                      step="1"
                      className="h-9 text-sm font-semibold"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="originalAnnualPrice"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="line-through">Original Annual Rate (MRP ₹)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 34990 (optional MRP)"
                      min="0"
                      step="1"
                      className="h-9 text-sm font-mono"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
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
                    <span>Active Offer Annual Price (₹/yr) *</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 24990"
                      min="0"
                      step="1"
                      className="h-9 text-sm font-semibold"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
          </div>

          {/* Live Price Preview Snippet */}
          <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>Buyer Display Preview:</span>
            </span>
            <div className="flex items-center gap-2">
              {originalMonthlyWatch > monthlyPriceWatch && (
                <span className="line-through text-muted-foreground/70 font-mono text-xs">
                  ₹{originalMonthlyWatch.toLocaleString('en-IN')}
                </span>
              )}
              <span className="font-black text-foreground font-mono text-sm">
                ₹{monthlyPriceWatch.toLocaleString('en-IN')}/mo
              </span>
              {originalMonthlyWatch > monthlyPriceWatch && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0 font-bold">
                  {Math.round(((originalMonthlyWatch - monthlyPriceWatch) / originalMonthlyWatch) * 100)}% OFF
                </Badge>
              )}
              {isBasePlanWatch && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold">
                  Base Plan
                </Badge>
              )}
              {offerBadgeWatch && (
                <Badge variant="secondary" className="text-[10px] font-medium bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {offerBadgeWatch}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Marketing Badges & Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="offerBadgeText"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span>Offer Badge Tag</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Launch Offer, Popular"
                    className="h-9 text-sm"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  <span>Display Sort Order</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    step="1"
                    className="h-9 text-sm font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* Base Plan Switch */}
        <FormField
          control={form.control}
          name="isBasePlan"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Designate as Base Plan</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Marks this tier as the foundational starter plan. Studios can subscribe and attach modular Add-ons.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

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
                  <span>Max Staff Logins *</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
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

        {/* Quick Tier Feature Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Presets:
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => applyPreset('starter')}
            className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            Starter Studio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => applyPreset('pro')}
            className="text-[11px] h-6 px-2 text-primary border-primary/30 hover:bg-primary/5"
          >
            Pro Studio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => applyPreset('enterprise')}
            className="text-[11px] h-6 px-2 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/5"
          >
            Enterprise Franchise
          </Button>
        </div>

        {/* Feature Allocation Checklist */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Included ERP Modules ({selectedFeatures.length}/9)</span>
            </FormLabel>
            <span className="text-[10px] text-muted-foreground">
              Check to include in base subscription
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20">
            {PLAN_FEATURES_CATALOG.map((f) => {
              const isSelected = selectedFeatures.includes(f.key);
              return (
                <div
                  key={f.key}
                  onClick={() => toggleFeature(f.key)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-foreground shadow-xs'
                      : 'bg-card/40 border-border/50 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-background'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-tight truncate">
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

        {/* Multi-Branch Franchising Governance */}
        <div className="p-3 rounded-lg border border-border/70 bg-card space-y-3">
          <FormField
            control={form.control}
            name="allowFranchises"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-primary" />
                    <span>Franchise Network License</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Grants franchise provisioning desk and child studio management.
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
