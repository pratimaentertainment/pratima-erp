'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  IndianRupee,
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  Receipt,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/currency';
import { recordOfflinePaymentAction } from '@/actions/super-admin-billing.actions';

interface RecordOfflinePaymentDialogProps {
  tenants: any[];
  plans: any[];
  onPaymentSuccess?: () => void;
}

export function RecordOfflinePaymentDialog({
  tenants,
  plans,
  onPaymentSuccess,
}: RecordOfflinePaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'NEFT' | 'CASH' | 'CHEQUE'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  // Selected plan lookup
  const currentPlan = plans.find((p) => p.id === selectedPlanId);

  // Auto-fill amount when plan or cycle changes (unless user explicitly customized)
  useEffect(() => {
    if (currentPlan) {
      const defaultPrice =
        billingCycle === 'ANNUAL'
          ? currentPlan.annualPrice
          : currentPlan.monthlyPrice;
      setAmount(defaultPrice.toString());
    }
  }, [selectedPlanId, billingCycle, currentPlan]);

  // When tenant is selected, suggest their current plan if assigned
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant?.subscription?.planId) {
      setSelectedPlanId(tenant.subscription.planId);
      if (tenant.subscription.billingCycle) {
        setBillingCycle(tenant.subscription.billingCycle);
      }
    } else if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenantId) {
      toast.error('Please select a studio tenant.');
      return;
    }
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }
    if (!transactionRef.trim()) {
      toast.error('Transaction reference / UTR / Cheque number is required.');
      return;
    }

    startTransition(async () => {
      const res = await recordOfflinePaymentAction({
        tenantId: selectedTenantId,
        planId: selectedPlanId,
        billingCycle,
        amount: numAmount,
        paymentMode,
        transactionRef: transactionRef.trim(),
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message);
        setOpen(false);
        // Reset form
        setSelectedTenantId('');
        setTransactionRef('');
        setNotes('');
        onPaymentSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to record offline payment.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 shadow-xs font-semibold text-xs h-9">
            <Plus className="h-4 w-4" />
            <span>Record Offline Payment</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-heading">
                Record B2B Offline Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Log manual payments (NEFT, UPI, Cash, Cheque) to activate studio subscription and lift Hard Lock.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          {/* Tenant Selector */}
          <div>
            <Label className="text-xs font-semibold">Photography Studio (Tenant)</Label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              required
              className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
            >
              <option value="">Select Studio Tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (/{t.slug}) &bull; {t.subscriptionStatus}
                </option>
              ))}
            </select>
          </div>

          {/* Plan & Cycle Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Subscription Plan</Label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                required
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="">Select Plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.monthlyPrice)}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Billing Cycle</Label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="MONTHLY">Monthly (30 Days)</option>
                <option value="ANNUAL">Annual (365 Days)</option>
              </select>
            </div>
          </div>

          {/* Amount & Payment Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Collected Amount (₹ INR)</Label>
              <div className="relative mt-1">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 9999"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-xs h-9 font-semibold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
                <option value="NEFT">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="CASH">Cash Deposit / In-Person</option>
                <option value="CHEQUE">Bank Cheque / Demand Draft</option>
              </select>
            </div>
          </div>

          {/* Reference UTR Number */}
          <div>
            <Label className="text-xs font-semibold">
              Transaction Ref / UTR / Cheque Number <span className="text-rose-500">*</span>
            </Label>
            <Input
              required
              placeholder="e.g. UTR384920202948 or CHEQUE-92049"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="mt-1 h-9 text-xs font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">B2B Deal Notes (Optional)</Label>
            <Input
              placeholder="e.g. Founder annual discount agreed via WhatsApp"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>

          {/* Plan Quotas Preview Card */}
          {currentPlan && (
            <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Plan Limits: <strong>{currentPlan.maxBranches} Branch(es)</strong> &bull;{' '}
                <strong>{currentPlan.maxStaff} Staff</strong>
              </span>
              <Badge variant="outline" className="text-[10px] bg-background font-mono">
                {billingCycle === 'ANNUAL' ? 'Valid +365 Days' : 'Valid +30 Days'}
              </Badge>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm &amp; Unlock Studio
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
