'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, Loader2, Sparkles, AlertCircle, Network, IndianRupee, Check, GitBranch, Users } from 'lucide-react';
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
    monthlyPrice: number | string;
    annualPrice: number | string;
    maxBranches: number;
    maxStaff: number;
    features?: string[];
    smsCredits?: number;
    whatsappCredits?: number;
    allowFranchises?: boolean;
    perFranchiseMonthlyPrice?: number | string | null;
    perFranchiseAnnualPrice?: number | string | null;
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
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      maxBranches: plan.maxBranches,
      maxStaff: plan.maxStaff,
      features: initialFeatures,
      smsCredits: 0,
      whatsappCredits: 0,
      allowFranchises: plan.allowFranchises ?? false,
      perFranchiseMonthlyPrice: Number(plan.perFranchiseMonthlyPrice || 0),
      perFranchiseAnnualPrice: Number(plan.perFranchiseAnnualPrice || 0),
      isActive: plan.isActive,
    },
  });

  const selectedFeatures = watch('features') || [];
  const allowFranchisesWatch = watch('allowFranchises');
  const isActiveWatch = watch('isActive');

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
    setValue('features', updated);
  };

  const applyPreset = (preset: 'starter' | 'pro' | 'enterprise') => {
    if (preset === 'starter') {
      setValue('features', [...STARTER_DEFAULT_FEATURES]);
      setValue('allowFranchises', false);
    } else if (preset === 'pro') {
      setValue('features', [...PRO_DEFAULT_FEATURES]);
      setValue('allowFranchises', false);
    } else {
      setValue('features', [...ENTERPRISE_DEFAULT_FEATURES]);
      setValue('allowFranchises', true);
    }
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
          setFormError(res.error || 'Failed to update plan.');
          toast.error(res.error || 'Failed to update plan.');
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({
            name: plan.name,
            monthlyPrice: Number(plan.monthlyPrice),
            annualPrice: Number(plan.annualPrice),
            maxBranches: plan.maxBranches,
            maxStaff: plan.maxStaff,
            features: initialFeatures,
            smsCredits: 0,
            whatsappCredits: 0,
            allowFranchises: plan.allowFranchises ?? false,
            perFranchiseMonthlyPrice: Number(plan.perFranchiseMonthlyPrice || 0),
            perFranchiseAnnualPrice: Number(plan.perFranchiseAnnualPrice || 0),
            isActive: plan.isActive,
          });
          setFormError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 hover:bg-muted"
            title={`Edit ${plan.name} configuration`}
          >
            <Edit2 className="h-3 w-3 text-muted-foreground" />
            <span>Edit Tier</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-bold font-heading">
              Edit Subscription Tier: {plan.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Slug: <code className="font-mono text-foreground font-semibold">{plan.slug}</code> (immutable identifier). Updates apply immediately to upcoming renewals.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
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

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthlyPrice" className="text-xs font-semibold">
                Monthly Price (₹) *
              </Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                placeholder="2499"
                className="text-xs h-9"
                {...register('monthlyPrice')}
              />
              {errors.monthlyPrice && (
                <p className="text-[11px] text-destructive">
                  {errors.monthlyPrice.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="annualPrice" className="text-xs font-semibold">
                Annual Price (₹) *
              </Label>
              <Input
                id="annualPrice"
                type="number"
                step="0.01"
                placeholder="24990"
                className="text-xs h-9"
                {...register('annualPrice')}
              />
              {errors.annualPrice && (
                <p className="text-[11px] text-destructive">
                  {errors.annualPrice.message}
                </p>
              )}
            </div>
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

          {/* Feature Matrix & Add-ons Grid */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold text-foreground">
                  Included Features &amp; Add-ons ({selectedFeatures.length}/{PLAN_FEATURES_CATALOG.length})
                </Label>
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

          {/* Franchising & Flexi-Billing Configuration */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  <span>Enable Franchise Network &amp; Flexi-Billing</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Allows studios on this plan to create and govern linked franchisee studios.
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
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="space-y-1.5">
                  <Label htmlFor="perFranchiseMonthlyPrice" className="text-xs font-semibold flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Monthly / Franchise (₹)</span>
                  </Label>
                  <Input
                    id="perFranchiseMonthlyPrice"
                    type="number"
                    step="0.01"
                    placeholder="999"
                    className="text-xs h-9"
                    {...register('perFranchiseMonthlyPrice')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="perFranchiseAnnualPrice" className="text-xs font-semibold flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Annual / Franchise (₹)</span>
                  </Label>
                  <Input
                    id="perFranchiseAnnualPrice"
                    type="number"
                    step="0.01"
                    placeholder="9990"
                    className="text-xs h-9"
                    {...register('perFranchiseAnnualPrice')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Active &amp; Available for Studios</Label>
              <p className="text-[11px] text-muted-foreground">
                Deactivating hides this tier from public signup and studio upgrades.
              </p>
            </div>
            <Switch
              checked={isActiveWatch}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
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
              className="text-xs gap-1.5 font-semibold"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
