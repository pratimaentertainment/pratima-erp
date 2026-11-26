'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EditPlanDialog } from './edit-plan-dialog';
import { togglePlanActiveStatusAction } from '@/actions/subscription.actions';
import { toast } from 'sonner';

interface PlanActionsProps {
  plan: {
    id: string;
    name: string;
    slug: string;
    monthlyPrice: number | string;
    annualPrice: number | string;
    originalMonthlyPrice?: number | string | null;
    originalAnnualPrice?: number | string | null;
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

export function PlanActions({ plan }: PlanActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      try {
        const res = await togglePlanActiveStatusAction(plan.id, checked);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to update plan status.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred while updating status.');
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
      <div className="flex items-center gap-2">
        <Switch
          id={`toggle-plan-${plan.id}`}
          checked={plan.isActive}
          disabled={isPending}
          onCheckedChange={handleToggle}
          title={plan.isActive ? 'Deactivate tier' : 'Activate tier'}
        />
        <Label
          htmlFor={`toggle-plan-${plan.id}`}
          className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {plan.isActive ? 'Active' : 'Archived'}
        </Label>
      </div>

      <EditPlanDialog plan={plan} />
    </div>
  );
}
