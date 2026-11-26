'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Edit2,
  Loader2,
  Sparkles,
  AlertCircle,
  Network,
  IndianRupee,
  Check,
  GitBranch,
  Users,
  Layers,
  Tag,
  ArrowUpDown,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { updatePlanSchema, type UpdatePlanInput } from '@/schemas/subscription.schema';
import { updateSubscriptionPlanAction } from '@/actions/subscription.actions';
import {
  PLAN_FEATURES_CATALOG,
  PlanFeatureKey,
  STARTER_DEFAULT_FEATURES,
  PRO_DEFAULT_FEATURES,
  ENTERPRISE_DEFAULT_FEATURES,
} from '@/lib/constants/plan-features';

interface EditPlanDialogProps {
  plan: {
    id: string;
    name: string;
    slug: string;
    originalMonthlyPrice?: number | string | null;
    monthlyPrice: number | string;
    originalAnnualPrice?: number | string | null;
    annualPrice: number | string;
    offerBadgeText?: string | null;
    isBasePlan?: boolean;
    sortOrder?: number;
    maxBranches: number;
    maxStaff: number;
    features?: string[];
    smsCredits?: number;
    whatsappCredits?: number;
    allowFranchises?: boolean;
    perFranchiseMonthlyPrice?: number | string | null;
    perFranchiseAnnualPrice?: number | string | null;
    franchiseEnabled?: boolean;
    includedAddons?: string[];
    isActive: boolean;
  };
}

export function EditPlanDialog({ plan }: EditPlanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Initial features fallback if plan has empty features array
  const initialFeatures = React.useMemo(() => {
    if (plan.features && plan.features.length > 0) return plan.features;
    if (plan.slug.includes('enterprise')) return [...ENTERPRISE_DEFAULT_FEATURES];
    if (plan.slug.includes('pro')) return [...PRO_DEFAULT_FEATURES];
    return [...STARTER_DEFAULT_FEATURES];
  }, [plan.features, plan.slug]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdatePlanInput>({
    resolver: zodResolver(updatePlanSchema) as any,
    defaultValues: {
      name: plan.name,
      originalMonthlyPrice: plan.originalMonthlyPrice ? Number(plan.originalMonthlyPrice) : null,
      monthlyPrice: Number(plan.monthlyPrice),
      originalAnnualPrice: plan.originalAnnualPrice ? Number(plan.originalAnnualPrice) : null,
      annualPrice: Number(plan.annualPrice),
      offerBadgeText: plan.offerBadgeText || '',
      isBasePlan: plan.isBasePlan ?? false,
      sortOrder: plan.sortOrder ?? 0,
      maxBranches: plan.maxBranches,
      maxStaff: plan.maxStaff,
      features: initialFeatures,
      smsCredits: 0,
      whatsappCredits: 0,
      allowFranchises: plan.allowFranchises ?? false,
      perFranchiseMonthlyPrice: Number(plan.perFranchiseMonthlyPrice || 0),
      perFranchiseAnnualPrice: Number(plan.perFranchiseAnnualPrice || 0),
      franchiseEnabled: plan.franchiseEnabled ?? false,
      includedAddons: plan.includedAddons || [],
      isActive: plan.isActive,
    },
  });

  const selectedFeatures = watch('features') || [];
  const allowFranchisesWatch = watch('allowFranchises');
  const isActiveWatch = watch('isActive');
  const isBasePlanWatch = watch('isBasePlan');
  const monthlyPriceWatch = Number(watch('monthlyPrice') || 0);
  const originalMonthlyWatch = Number(watch('originalMonthlyPrice') || 0);
  const offerBadgeWatch = watch('offerBadgeText');

  const toggleFeature = (featureKey: PlanFeatureKey) => {
    let updated: string[];
    if (selectedFeatures.includes(featureKey)) {
      updated = selectedFeatures.filter((k) => k !== featureKey);
      if (featureKey === 'FRANCHISE_NETWORK') {
        setValue('allowFranchises', false);
      }
    } else {
      updated = [...selectedFeatures, featureKey];
      if (featureKey === 'FRANCHISE_NETWORK') {
        setValue('allowFranchises', true);
      }
    }
    setValue('features', updated, { shouldValidate: true });
  };

  const onSubmit = (data: UpdatePlanInput) => {
    setFormError(null);
    startTransition(async () => {
      try {
        const res = await updateSubscriptionPlanAction(plan.id, data);
        if (res.success) {
          toast.success(res.message);
          setOpen(false);
          router.refresh();
        } else {
          setFormError(res.error || 'Failed to update subscription plan.');
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Plan</span>
          </Button>
        }
      />

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-bold font-heading">
              Edit Subscription Plan
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              {plan.slug}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Adjust MRP vs active offer pricing, quotas, marketing badges, and feature entitlements.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Plan Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Plan Display Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g. Studio Pro"
              className="text-xs h-9"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name.message}</p>
            )}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="originalMonthlyPrice" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <span className="line-through">Original Monthly Rate (MRP ₹)</span>
                </Label>
                <Input
                  id="originalMonthlyPrice"
                  type="number"
                  step="1"
                  placeholder="e.g., 3499 (optional MRP)"
                  className="text-xs h-9 font-mono"
                  {...register('originalMonthlyPrice', {
                    setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="monthlyPrice" className="text-xs font-semibold flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-primary" />
                  <span>Active Offer Monthly Price (₹) *</span>
                </Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="1"
                  placeholder="2499"
                  className="text-xs h-9 font-semibold"
                  {...register('monthlyPrice')}
                />
                {errors.monthlyPrice && (
                  <p className="text-[11px] text-destructive">{errors.monthlyPrice.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="originalAnnualPrice" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <span className="line-through">Original Annual Rate (MRP ₹)</span>
                </Label>
                <Input
                  id="originalAnnualPrice"
                  type="number"
                  step="1"
                  placeholder="e.g., 34990 (optional MRP)"
                  className="text-xs h-9 font-mono"
                  {...register('originalAnnualPrice', {
                    setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="annualPrice" className="text-xs font-semibold flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-emerald-500" />
                  <span>Active Offer Annual Price (₹) *</span>
                </Label>
                <Input
                  id="annualPrice"
                  type="number"
                  step="1"
                  placeholder="24990"
                  className="text-xs h-9 font-semibold"
                  {...register('annualPrice')}
                />
                {errors.annualPrice && (
                  <p className="text-[11px] text-destructive">{errors.annualPrice.message}</p>
                )}
              </div>
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

          {/* Marketing Badge & Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="offerBadgeText" className="text-xs font-semibold flex items-center gap-1">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span>Offer Badge Tag</span>
              </Label>
              <Input
                id="offerBadgeText"
                placeholder="e.g., Launch Offer, Popular"
                className="text-xs h-9"
                {...register('offerBadgeText')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sortOrder" className="text-xs font-semibold flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                <span>Display Sort Order</span>
              </Label>
              <Input
                id="sortOrder"
                type="number"
                step="1"
                placeholder="0"
                className="text-xs h-9 font-mono"
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Base Plan Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Designate as Base Plan</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Marks this tier as the foundational starter plan. Studios can subscribe and attach modular Add-ons.
              </p>
            </div>
            <Switch
              checked={isBasePlanWatch}
              onCheckedChange={(checked) => setValue('isBasePlan', checked)}
            />
          </div>

          {/* Quotas & Capacity Limits */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="maxBranches" className="text-xs font-semibold flex items-center gap-1">
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                <span>Max Allowed Branches *</span>
              </Label>
              <Input
                id="maxBranches"
                type="number"
                placeholder="1"
                min="1"
                className="text-xs h-9"
                {...register('maxBranches')}
              />
              {errors.maxBranches && (
                <p className="text-[11px] text-destructive">
                  {errors.maxBranches.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxStaff" className="text-xs font-semibold flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Max Staff Accounts *</span>
              </Label>
              <Input
                id="maxStaff"
                type="number"
                placeholder="3"
                min="1"
                className="text-xs h-9"
                {...register('maxStaff')}
              />
              {errors.maxStaff && (
                <p className="text-[11px] text-destructive">
                  {errors.maxStaff.message}
                </p>
              )}
            </div>
          </div>

          {/* Feature Allocation Checklist */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Included ERP Modules ({selectedFeatures.length}/9)</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Check to include in tier subscription
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

          
          {/* Franchise Network License Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-primary" />
                <span>Franchise Network License &amp; Tools</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enables multi-franchise network provisioning and child studio management.
              </p>
            </div>
            <Switch
              checked={watch('franchiseEnabled')}
              onCheckedChange={(checked) => setValue('franchiseEnabled', checked)}
            />
          </div>

          {/* Bundled Add-ons Checklist */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Inbuilt Add-ons (Bundled at ₹0)</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Included free in this plan tier
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20">
              {[
                { key: 'AI_FACE_RECOGNITION', label: 'AI Face Recognition (Inbuilt in Higher Plan)' },
                { key: 'BROADCAST_MESSAGING', label: 'Customer Broadcast Messaging (Inbuilt in Higher Plan)' },
              ].map((addon) => {
                const current = watch('includedAddons') || [];
                const isIncluded = current.includes(addon.key);
                return (
                  <div
                    key={addon.key}
                    onClick={() => {
                      const updated = isIncluded
                        ? current.filter((k) => k !== addon.key)
                        : [...current, addon.key];
                      setValue('includedAddons', updated);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      isIncluded
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-card/40 border-border/50 text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        isIncluded
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isIncluded && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">{addon.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Franchise Network Governance */}
          <div className="p-3 rounded-lg border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  <span>Franchise Network License</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Grants child franchisee provisioning and auto-royalty network engine.
                </p>
              </div>
              <Switch
                checked={allowFranchisesWatch}
                onCheckedChange={(checked) => {
                  setValue('allowFranchises', checked);
                  if (checked && !selectedFeatures.includes('FRANCHISE_NETWORK')) {
                    setValue('features', [...selectedFeatures, 'FRANCHISE_NETWORK']);
                  }
                }}
              />
            </div>

            {allowFranchisesWatch && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <Label htmlFor="perFranchiseMonthlyPrice" className="text-xs font-medium flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Per-Franchise Rate (Monthly ₹)</span>
                  </Label>
                  <Input
                    id="perFranchiseMonthlyPrice"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="text-xs h-9 font-mono"
                    {...register('perFranchiseMonthlyPrice')}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="perFranchiseAnnualPrice" className="text-xs font-medium flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Per-Franchise Rate (Annual ₹)</span>
                  </Label>
                  <Input
                    id="perFranchiseAnnualPrice"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="text-xs h-9 font-mono"
                    {...register('perFranchiseAnnualPrice')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tier Active Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">
                Plan Availability Status
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Active plans appear on public pricing and tenant upgrade selection tables.
              </p>
            </div>
            <Switch
              checked={isActiveWatch}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs font-semibold gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
