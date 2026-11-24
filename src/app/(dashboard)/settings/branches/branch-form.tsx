'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BranchCreateInput, branchSchema } from '@/lib/validations/branch.schema';
import { createBranchAction, updateBranchAction } from '@/actions/branch.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { UpgradePlanModal } from '@/components/billing/upgrade-plan-modal';
import { toast } from 'sonner';

interface BranchFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function BranchForm({ initialData, onSuccess }: BranchFormProps) {
  const [loading, setLoading] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      shortName: initialData?.shortName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      gstNumber: initialData?.gstNumber || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      country: initialData?.country || 'US',
      postalCode: initialData?.postalCode || '',
      timezone: initialData?.timezone || 'UTC',
      isHeadOffice: initialData?.isHeadOffice || false,
      isActive: initialData?.isActive ?? true,
    },
  });

  async function onSubmit(data: BranchCreateInput) {
    setLoading(true);
    let result;
    if (initialData?.id) {
      result = await updateBranchAction(initialData.id, data);
    } else {
      result = await createBranchAction(data);
    }
    setLoading(false);

    if (result.success) {
      toast.success(`Branch ${initialData ? 'updated' : 'created'} successfully`);
      if (onSuccess) onSuccess();
    } else {
      if ((result as any).code === 'PLAN_LIMIT_EXCEEDED') {
        setUpgradeModalOpen(true);
      } else {
        toast.error(result.error || 'Operation failed');
      }
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isHeadOffice"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Head Office</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Mark this branch as the central Head Office (this will override any existing Head Office).
                  </div>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onSuccess && onSuccess()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Branch'}
            </Button>
          </div>
        </form>
      </Form>

      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Branch Quota Reached"
        description="Your studio has reached the maximum branch quota for your current subscription plan. Upgrade to expand and manage more studio branches."
        requiredTier="Enterprise Franchise"
        limitType="branch"
      />
    </>
  );
}
