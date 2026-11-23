'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, Loader2, Sparkles, AlertCircle, Network, IndianRupee } from 'lucide-react';
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

interface EditPlanDialogProps {
  plan: {
    id: string;
    name: string;
    slug: string;
    monthlyPrice: number | string;
    annualPrice: number | string;
    maxBranches: number;
    maxStaff: number;
    smsCredits: number;
    whatsappCredits: number;
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
      smsCredits: plan.smsCredits,
      whatsappCredits: plan.whatsappCredits,
      allowFranchises: plan.allowFranchises ?? false,
      perFranchiseMonthlyPrice: Number(plan.perFranchiseMonthlyPrice || 0),
      perFranchiseAnnualPrice: Number(plan.perFranchiseAnnualPrice || 0),
      isActive: plan.isActive,
    },
  });

  const isActiveWatch = watch('isActive');
  const allowFranchisesWatch = watch('allowFranchises');

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
            smsCredits: plan.smsCredits,
            whatsappCredits: plan.whatsappCredits,
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

      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
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
                placeholder="2999"
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
                placeholder="29999"
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
              <Label htmlFor="maxBranches" className="text-xs font-semibold">
                Max Allowed Branches *
              </Label>
              <Input
                id="maxBranches"
                type="number"
                placeholder="2"
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
              <Label htmlFor="maxStaff" className="text-xs font-semibold">
                Max Staff Accounts *
              </Label>
              <Input
                id="maxStaff"
                type="number"
                placeholder="10"
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

          {/* Monthly Communications Allocation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="smsCredits" className="text-xs font-semibold">
                Included SMS Credits
              </Label>
              <Input
                id="smsCredits"
                type="number"
                placeholder="500"
                className="text-xs h-9"
                {...register('smsCredits')}
              />
              {errors.smsCredits && (
                <p className="text-[11px] text-destructive">
                  {errors.smsCredits.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsappCredits" className="text-xs font-semibold">
                Included WhatsApp Credits
              </Label>
              <Input
                id="whatsappCredits"
                type="number"
                placeholder="1000"
                className="text-xs h-9"
                {...register('whatsappCredits')}
              />
              {errors.whatsappCredits && (
                <p className="text-[11px] text-destructive">
                  {errors.whatsappCredits.message}
                </p>
              )}
            </div>
          </div>

          {/* Franchising & Flexi-Billing Configuration */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  <span>Enable Franchise Network & Flexi-Billing</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Allows studios on this plan to create and govern linked franchisee studios.
                </p>
              </div>
              <Switch
                checked={allowFranchisesWatch}
                onCheckedChange={(checked) => setValue('allowFranchises', checked)}
              />
            </div>

            {allowFranchisesWatch && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <Label htmlFor="perFranchiseMonthlyPrice" className="text-xs font-medium flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Per Franchise / Mo</span>
                  </Label>
                  <Input
                    id="perFranchiseMonthlyPrice"
                    type="number"
                    placeholder="0"
                    min="0"
                    className="text-xs h-9"
                    {...register('perFranchiseMonthlyPrice')}
                  />
                  {errors.perFranchiseMonthlyPrice && (
                    <p className="text-[11px] text-destructive">
                      {errors.perFranchiseMonthlyPrice.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="perFranchiseAnnualPrice" className="text-xs font-medium flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span>Per Franchise / Yr</span>
                  </Label>
                  <Input
                    id="perFranchiseAnnualPrice"
                    type="number"
                    placeholder="0"
                    min="0"
                    className="text-xs h-9"
                    {...register('perFranchiseAnnualPrice')}
                  />
                  {errors.perFranchiseAnnualPrice && (
                    <p className="text-[11px] text-destructive">
                      {errors.perFranchiseAnnualPrice.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active / Inactive Status Switch */}
          <div className="pt-3 border-t flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">
                Active for New Subscriptions
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When inactive, this tier will be hidden from public pricing and registration.
              </p>
            </div>
            <Switch
              checked={isActiveWatch}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs h-9 gap-1.5 font-semibold"
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
