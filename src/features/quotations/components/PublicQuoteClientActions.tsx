'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { 
  CheckCircle2, 
  Edit3, 
  Printer, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Loader2,
  PhoneCall
} from 'lucide-react';
import { acceptQuotation, requestQuotationChanges } from '@/actions/quotation-client.actions';
import { toast } from 'sonner';

interface PublicQuoteClientActionsProps {
  quotation: any;
}

export function PublicQuoteClientActions({ quotation }: PublicQuoteClientActionsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = React.useState<string>(quotation?.status || 'DRAFT');
  
  // Modal states
  const [acceptDialogOpen, setAcceptDialogOpen] = React.useState(false);
  const [changesDialogOpen, setChangesDialogOpen] = React.useState(false);

  // Form states
  const [clientNotes, setClientNotes] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [termsAgreed, setTermsAgreed] = React.useState(false);

  // Loading states
  const [isSubmittingAccept, setIsSubmittingAccept] = React.useState(false);
  const [isSubmittingChanges, setIsSubmittingChanges] = React.useState(false);

  const grandTotal = Number(quotation.grandTotal || quotation.totalAmount || 0);
  const isAccepted = currentStatus === 'ACCEPTED' || currentStatus === 'WON';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleAcceptSubmit = async () => {
    if (!termsAgreed) {
      toast.error('Please accept the studio terms & conditions to confirm.');
      return;
    }

    try {
      setIsSubmittingAccept(true);
      const res = await acceptQuotation(quotation.id, clientNotes);

      if (res.success) {
        setCurrentStatus('ACCEPTED');
        setAcceptDialogOpen(false);
        toast.success('Booking confirmed! Thank you for choosing our studio.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to accept quotation.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while confirming quotation.');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleChangesSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please describe the changes or questions you have.');
      return;
    }

    try {
      setIsSubmittingChanges(true);
      const res = await requestQuotationChanges(quotation.id, feedback);

      if (res.success) {
        setChangesDialogOpen(false);
        setFeedback('');
        toast.success('Your revision request has been sent to the studio team.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to submit changes request.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while submitting feedback.');
    } finally {
      setIsSubmittingChanges(false);
    }
  };

  return (
    <>
      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg py-3 px-4 md:px-8 print:hidden transition-all duration-300">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Summary Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Net Investment
              </p>
              <p className="text-lg md:text-xl font-black font-mono text-slate-900 leading-tight">
                {formatMoney(grandTotal, 'INR')}
              </p>
            </div>

            {isAccepted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Booking Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 text-xs font-medium rounded-full sm:hidden">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Pending
              </span>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 text-xs h-9"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print / PDF</span>
            </Button>

            {!isAccepted ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChangesDialogOpen(true)}
                  className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 text-xs h-9"
                >
                  <Edit3 className="w-4 h-4 text-slate-500" />
                  <span>Request Changes</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setAcceptDialogOpen(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm h-9 px-4"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept & Confirm Booking</span>
                </Button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Dates Reserved & Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept & Confirm Booking Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Confirm & Book Proposal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              You are confirming your photography booking with {quotation.tenant?.settings?.studioName || quotation.tenant?.name || 'our studio'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Proposal Ref:</span>
                <span className="font-mono font-bold text-slate-800">
                  {quotation.quoteNumber || quotation.quotationNumber || 'QT-DRAFT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Net Investment:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(grandTotal, 'INR')}
                </span>
              </div>
              {quotation.eventDate && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Shoot / Event Date:</span>
                  <span className="font-semibold text-slate-800" suppressHydrationWarning>
                    {formatDate(quotation.eventDate, 'dd MMM yyyy')}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Additional Notes or Special Requests (Optional)
              </label>
              <Textarea
                placeholder="Any special timing notes, venue instructions, or specific preferences..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none text-slate-900 bg-white border-slate-300 placeholder:text-slate-400 focus-visible:ring-emerald-500 dark:text-slate-900 dark:bg-white dark:border-slate-300 dark:placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                I have reviewed the scope of deliverables and agree to the studio policies & payment schedule.
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAcceptDialogOpen(false)}
              disabled={isSubmittingAccept}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAcceptSubmit}
              disabled={!termsAgreed || isSubmittingAccept}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              {isSubmittingAccept ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Confirming Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Booking Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={changesDialogOpen} onOpenChange={setChangesDialogOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
              <Edit3 className="w-6 h-6 text-indigo-700" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Request Changes or Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Please share the package modifications, timing changes, or scope adjustments you would like our team to make.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Required Adjustments / Feedback *
              </label>
              <Textarea
                placeholder="E.g., We would like to add drone coverage for the wedding day, or adjust the hours for the sangeet evening..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="text-xs text-slate-900 bg-white border-slate-300 placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:text-slate-900 dark:bg-white dark:border-slate-300 dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChangesDialogOpen(false)}
              disabled={isSubmittingChanges}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleChangesSubmit}
              disabled={!feedback.trim() || isSubmittingChanges}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5"
            >
              {isSubmittingChanges ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending to Studio...
                </>
              ) : (
                'Submit Revision Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
