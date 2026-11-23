'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle, Banknote, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markRoyaltySettledAction } from '@/actions/franchise.actions';

interface RecordSettlementModalProps {
  entry: {
    id: string;
    bookingTitle: string;
    franchiseeName: string;
    royaltyAmount: number;
    grossAmount: number;
  } | null;
  onClose: () => void;
}

export function RecordSettlementModal({ entry, onClose }: RecordSettlementModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settlementRef, setSettlementRef] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementRef.trim()) {
      setFormError('Please enter a valid Settlement Reference / UTR / Cheque number.');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      try {
        const res = await markRoyaltySettledAction({
          ledgerId: entry.id,
          settlementRef: settlementRef.trim(),
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message);
          onClose();
          router.refresh();
        } else {
          setFormError(res.error || 'Failed to record settlement.');
          toast.error(res.error || 'Failed to record settlement.');
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-heading">
                Record Royalty Settlement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mark pending royalty payment from {entry.franchiseeName} as settled.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Shoot & Royalty Breakdown */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/40 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking:</span>
              <span className="font-semibold text-foreground">{entry.bookingTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Franchisee Studio:</span>
              <span className="font-semibold text-foreground">{entry.franchiseeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Booking Value:</span>
              <span className="font-medium text-foreground">
                ₹{entry.grossAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/60">
              <span className="font-semibold text-foreground">Royalty Amount Due:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{entry.royaltyAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Reference Input */}
          <div className="space-y-1.5">
            <Label htmlFor="settlementRef" className="text-xs font-semibold flex items-center gap-1">
              <Banknote className="h-3 w-3 text-muted-foreground" />
              <span>Settlement Reference / UTR / Cheque No. *</span>
            </Label>
            <Input
              id="settlementRef"
              placeholder="e.g. UTR-AXIS-20261122001 or CHQ#49821"
              value={settlementRef}
              onChange={(e) => setSettlementRef(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              <span>Settlement Notes (Optional)</span>
            </Label>
            <Input
              id="notes"
              placeholder="e.g. Received via NEFT to HDFC primary account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Settling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Settlement</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
