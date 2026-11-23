'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/currency';
import { 
  CalendarCheck2, 
  Receipt, 
  Trophy, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  Calendar,
  User,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';
import { acceptQuotationByOperatorAction } from '@/actions/quotation.actions';
import { toast } from 'sonner';

export interface ConfirmBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quoteNumber?: string;
    quotationNumber?: string;
    grandTotal?: number;
    totalAmount?: number;
    subtotal?: number;
    customerName?: string;
    clientName?: string;
    customerPhone?: string;
    title?: string;
    lead?: any;
    functions?: Array<{ name: string; date?: Date | string | null; venue?: string | null }>;
  };
  onSuccess?: (result: any) => void;
}

export function ConfirmBookingModal({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: ConfirmBookingModalProps) {
  const router = useRouter();
  const [operatorNotes, setOperatorNotes] = React.useState('');
  const [isPending, setIsPending] = React.useState(false);
  const [confirmedData, setConfirmedData] = React.useState<any | null>(null);

  // Derive quote information
  const quoteNumber =
    quotation.quoteNumber ||
    quotation.quotationNumber ||
    `QT-${quotation.id.slice(0, 8).toUpperCase()}`;

  const customerName =
    quotation.customerName ||
    quotation.clientName ||
    quotation.lead?.customerName ||
    'Valued Client';

  const grandTotal = Number(
    quotation.grandTotal ?? quotation.totalAmount ?? quotation.subtotal ?? 0
  );

  const functionCount = quotation.functions?.length || 0;
  const functionsLabel =
    functionCount > 0
      ? `${functionCount} Event Function${functionCount > 1 ? 's' : ''}`
      : '1 Primary Event Session';

  const handleConfirm = async () => {
    if (isPending) return;

    try {
      setIsPending(true);

      const res = await acceptQuotationByOperatorAction(
        quotation.id,
        operatorNotes.trim() || undefined
      );

      if (res.success) {
        setConfirmedData(res.data);
        toast.success(
          res.message || 'Quotation accepted and booking successfully confirmed!'
        );
        onSuccess?.(res.data);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to confirm booking. Please try again.');
      }
    } catch (err: any) {
      console.error('[CONFIRM_BOOKING_MODAL_ERROR]', err);
      toast.error(
        err?.message || 'An unexpected error occurred while confirming booking.'
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    if (isPending) return;
    if (!open) {
      setConfirmedData(null);
      setOperatorNotes('');
      onClose();
    }
  };

  const handleNavigateToBooking = () => {
    onClose();
    if (confirmedData?.booking?.id) {
      router.push(`/operations/bookings/${confirmedData.booking.id}`);
    } else {
      router.push('/operations/bookings');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border bg-background shadow-2xl rounded-2xl gap-0">
        <AnimatePresence mode="wait">
          {!confirmedData ? (
            <motion.div
              key="confirm-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Header Banner */}
              <div className="relative p-6 pb-5 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border-b border-border/60">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
                    <CalendarCheck2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      Confirm Event Booking
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Sparkles className="w-3 h-3" /> 1-Click Handoff
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                      Convert proposal <span className="font-semibold text-foreground">{quoteNumber}</span> into an operational booking. This executes an atomic handoff across billing, scheduling, and pipeline.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                {/* Quotation Snapshot Card */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-foreground">{customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold bg-background px-2 py-0.5 rounded-md border">
                      {quoteNumber}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Grand Total
                      </p>
                      <p className="text-lg font-bold text-foreground tracking-tight mt-0.5">
                        {formatMoney(grandTotal, 'INR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Scope & Schedule
                      </p>
                      <p className="text-sm font-semibold text-foreground tracking-tight mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {functionsLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3-Step Atomic Impact List */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    What happens upon confirmation:
                  </p>

                  <div className="grid gap-2 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-semibold text-foreground">1. Generate Primary Invoice</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Creates a sequential invoice for <span className="font-semibold text-foreground">{formatMoney(grandTotal, 'INR')}</span> mapped with line items from this quotation.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                        <CalendarCheck2 className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-semibold text-foreground">2. Block Calendar & Create SubEvents</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Schedules confirmed booking dates, allocates {functionsLabel}, and initializes post-production deliverable tasks.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-semibold text-foreground">3. Mark Lead as WON & Unlock Portal</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Transitions the sales lead pipeline to WON (100% conversion) and confirms client portal access credentials.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operator Notes Input */}
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="operator-notes"
                    className="text-xs font-medium text-foreground flex items-center justify-between"
                  >
                    <span>Operator Confirmation Notes (Optional)</span>
                    <span className="text-[11px] text-muted-foreground">Internal record</span>
                  </label>
                  <Textarea
                    id="operator-notes"
                    placeholder="E.g., Client verbally confirmed on WhatsApp call; 40% booking deposit agreed."
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    disabled={isPending}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="p-4 bg-muted/40 border-t border-border/60 sm:justify-between flex-row items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModalClose(false)}
                  disabled={isPending}
                  className="text-xs h-9 px-4 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Processing Handoff...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Confirm Booking & Generate Invoice
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-6 text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/30 shadow-md">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  Booking Confirmed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Quotation <span className="font-semibold text-foreground">{quoteNumber}</span> has been converted to an active booking. The lead is marked WON and financial invoice generated.
                </p>
              </div>

              {/* Booking Reference Details */}
              <div className="bg-muted/40 rounded-xl border p-4 text-left space-y-2 max-w-md mx-auto text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Booking Number:</span>
                  <span className="font-mono font-bold text-foreground">
                    {confirmedData?.booking?.bookingNumber || 'Generated'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Invoice Reference:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {confirmedData?.invoice?.invoiceNumber || 'Created'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Customer Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Confirmed & Portal Active
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleModalClose(false)}
                  className="text-xs h-9 px-4"
                >
                  Stay on Quotation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNavigateToBooking}
                  className="text-xs h-9 px-4 font-semibold bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  View Event Booking <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
