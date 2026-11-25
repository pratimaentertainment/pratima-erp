'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IndianRupee, CreditCard, Send, CheckCircle2, Loader2, Landmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMoney } from '@/lib/currency';
import { recordDealerPayoutAction } from '@/actions/super-admin-dealer.actions';

interface RecordPayoutDialogProps {
  dealer: {
    id: string;
    dealerCode: string;
    businessName: string;
    contactPerson: string;
    pendingPayout: number;
    bankDetails: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

export function RecordPayoutDialog({
  dealer,
  open,
  onOpenChange,
  onRecorded,
}: RecordPayoutDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'NEFT' | 'IMPS' | 'BANK_TRANSFER' | 'CASH'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (dealer) {
      setAmount(dealer.pendingPayout > 0 ? String(dealer.pendingPayout) : '');
      setTransactionRef('');
      setNotes('');
    }
  }, [dealer]);

  if (!dealer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }

    if (!transactionRef.trim()) {
      toast.error('Bank UTR or Transaction reference number is required');
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordDealerPayoutAction({
          dealerId: dealer.id,
          amount: numericAmount,
          paymentMode,
          transactionRef: transactionRef.trim(),
          notes: notes.trim() || null,
        });

        if (res.success) {
          toast.success(res.message);
          onOpenChange(false);
          router.refresh();
          onRecorded?.();
        } else {
          toast.error(res.error || 'Failed to record payout');
        }
      } catch (err: any) {
        toast.error(err.message || 'Something went wrong');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Record Commission Payout</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Disburse partner commission earnings and mark pending ledger entries as paid.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dealer Snapshot Card */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{dealer.businessName}</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
              {dealer.dealerCode}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pending Unsettled Commission:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatMoney(dealer.pendingPayout)}
            </span>
          </div>
          {dealer.bankDetails && (
            <div className="pt-1.5 border-t border-border/60 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1 font-semibold text-foreground/80 mb-0.5">
                <Landmark className="h-3 w-3" />
                <span>Bank Details:</span>
              </div>
              <p className="font-mono whitespace-pre-wrap">{dealer.bankDetails}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Payout Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Disbursed Amount (₹) *</Label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-sm font-bold"
              />
            </div>
          </div>

          {/* Payment Mode & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Mode *</Label>
              <Select
                value={paymentMode}
                onValueChange={(val: any) => setPaymentMode(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI Transfer</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Direct Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash / Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">UTR / Transaction Ref *</Label>
              <Input
                required
                placeholder="e.g. UTR49281729103"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="text-xs font-mono uppercase"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Remarks / Internal Notes</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Settled monthly commissions for Oct-Nov"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording Payout...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Record &amp; Settle Payout</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
