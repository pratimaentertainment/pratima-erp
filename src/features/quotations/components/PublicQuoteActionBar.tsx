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
  Clock, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  Eraser,
  PenLine,
  Copy,
  Landmark,
  QrCode,
  Sparkles
} from 'lucide-react';
import { acceptQuotation, requestQuotationChanges } from '@/actions/quotation-client.actions';
import { toast } from 'sonner';

export interface PublicQuoteActionBarProps {
  quotation: {
    id: string;
    quoteNumber?: string;
    quotationNumber?: string;
    status?: string;
    pricingMode?: string;
    lumpSumAmount?: number | null;
    grandTotal?: number;
    totalAmount?: number;
    advanceRequired?: number | null;
    eventDate?: string | Date | null;
    updatedAt?: string | Date;
    clientSignature?: string | null;
    acceptedAt?: string | Date | null;
    tenant?: {
      name?: string;
      tradeName?: string | null;
      phone?: string | null;
      email?: string | null;
      bankDetails?: any;
      settings?: {
        studioName?: string | null;
        bankDetails?: any;
        upiId?: string | null;
        phone?: string | null;
        email?: string | null;
      } | null;
    } | null;
    branch?: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    } | null;
  };
}

export function PublicQuoteActionBar({ quotation }: PublicQuoteActionBarProps) {
  const router = useRouter();
  const rawStatus = (quotation?.status || 'DRAFT').toUpperCase();
  const [currentStatus, setCurrentStatus] = React.useState<string>(rawStatus);
  
  // Modal states
  const [acceptDialogOpen, setAcceptDialogOpen] = React.useState(false);
  const [changesDialogOpen, setChangesDialogOpen] = React.useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = React.useState(false);

  // Form states
  const [clientNotes, setClientNotes] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [termsAgreed, setTermsAgreed] = React.useState(false);

  // Canvas Signature states
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);

  // Loading states
  const [isSubmittingAccept, setIsSubmittingAccept] = React.useState(false);
  const [isSubmittingChanges, setIsSubmittingChanges] = React.useState(false);

  const isLumpSum = (quotation as any)?.pricingMode === 'LUMP_SUM';
  const grandTotal = (isLumpSum && (quotation as any)?.lumpSumAmount != null)
    ? Number((quotation as any).lumpSumAmount)
    : Number(quotation.grandTotal ?? quotation.totalAmount ?? 0);
  const advanceRequired = quotation.advanceRequired
    ? Number(quotation.advanceRequired)
    : Math.round(grandTotal * 0.5);

  const isAccepted = 
    currentStatus === 'ACCEPTED' || 
    currentStatus === 'APPROVED' || 
    currentStatus === 'CONVERTED' || 
    currentStatus === 'WON';
  const isRejected = currentStatus === 'REJECTED' || currentStatus === 'REVISION_REQUESTED';
  const isExpired = currentStatus === 'EXPIRED';

  const tenant = quotation.tenant;
  const branch = (quotation as any).branch;
  const settings = tenant?.settings;
  const studioName = settings?.studioName || tenant?.tradeName || tenant?.name || 'Studio';
  const quoteRef = quotation.quoteNumber || quotation.quotationNumber || 'QT-PROPOSAL';

  const studioPhone = branch?.phone || settings?.phone || tenant?.phone || '';
  const studioEmail = branch?.email || settings?.email || tenant?.email || '';

  const rawBank = tenant?.bankDetails || settings?.bankDetails;

  let bankName = '';
  let accountHolderName = '';
  let accountNumber = '';
  let ifscCode = '';
  let upiId = '';
  let branchName = '';
  let accountType = '';

  if (typeof rawBank === 'object' && rawBank !== null) {
    bankName = rawBank.bankName || '';
    accountHolderName = rawBank.accountHolderName || rawBank.acName || studioName;
    accountNumber = rawBank.accountNumber || rawBank.bankAccountNumber || '';
    ifscCode = rawBank.ifscCode || rawBank.ifsc || '';
    upiId = rawBank.upiId || settings?.upiId || '';
    branchName = rawBank.branchName || branch?.name || '';
    accountType = rawBank.accountType || '';
  } else if (typeof rawBank === 'string' && rawBank.trim().length > 0) {
    upiId = settings?.upiId || '';
  } else {
    upiId = settings?.upiId || '';
  }

  const hasBankingDetails = Boolean(
    (typeof rawBank === 'object' && rawBank !== null && (accountNumber || bankName || upiId || ifscCode)) ||
    (typeof rawBank === 'string' && rawBank.trim().length > 0) ||
    Boolean(upiId)
  );

  const bankDetailsText = typeof rawBank === 'string' && rawBank.trim().length > 0
    ? rawBank.trim()
    : [
        bankName ? `Bank Name: ${bankName}` : null,
        accountHolderName ? `A/C Name: ${accountHolderName}` : null,
        accountNumber ? `A/C Number: ${accountNumber}` : null,
        ifscCode ? `IFSC Code: ${ifscCode}` : null,
        branchName ? `Branch: ${branchName}` : null,
        accountType ? `A/C Type: ${accountType}` : null,
      ].filter(Boolean).join('\n');

  // Initialize canvas when accept dialog opens
  React.useEffect(() => {
    if (acceptDialogOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 600;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignature(false);
    }
  }, [acceptDialogOpen]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }

    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  };

  const handleAcceptSubmit = async () => {
    if (!hasSignature) {
      toast.error('Please sign in the digital signature pad before confirming.');
      return;
    }

    if (!termsAgreed) {
      toast.error('Please acknowledge and agree to the studio policies & payment schedule.');
      return;
    }

    const signatureDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;

    try {
      setIsSubmittingAccept(true);
      const res = await acceptQuotation(quotation.id, clientNotes, {
        clientSignature: signatureDataUrl,
        acceptanceTerms: 'I agree to the quotation deliverables, terms & conditions, and advance payment schedule.',
      });

      if (res.success) {
        setCurrentStatus('ACCEPTED');
        setAcceptDialogOpen(false);
        setDepositDialogOpen(true);
        toast.success('Quotation accepted! Your booking is successfully confirmed.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to accept quotation.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while confirming booking.');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleChangesSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please describe the adjustments or questions you have.');
      return;
    }

    try {
      setIsSubmittingChanges(true);
      const res = await requestQuotationChanges(quotation.id, feedback);

      if (res.success) {
        setCurrentStatus('REVISION_REQUESTED');
        setChangesDialogOpen(false);
        setFeedback('');
        toast.success('Revision request sent! Our studio team will review your notes and prepare an updated quotation.');
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
      {/* Sticky Bottom Client Action Bar */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/90 shadow-lg py-3 px-4 md:px-8 print:hidden transition-all duration-300">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Total Net Investment and Status */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Net Investment
              </p>
              <p className="text-lg md:text-xl font-black font-mono text-slate-900 leading-tight">
                {formatMoney(grandTotal, 'INR')}
              </p>
            </div>

            {isAccepted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Booking Confirmed
              </span>
            )}

            {isRejected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Revision Requested
              </span>
            )}

            {isExpired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full border border-slate-300">
                <Clock className="w-4 h-4 text-slate-600" />
                Offer Expired
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

            {/* When already accepted, show deposit payment instructions button */}
            {isAccepted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDepositDialogOpen(true)}
                className="gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-xs h-9 font-semibold"
              >
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>Deposit & Bank Details</span>
              </Button>
            )}

            {/* When not locked/accepted/rejected, show workflow buttons */}
            {!isAccepted && !isRejected && !isExpired && (
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
                  <span>Sign & Accept Proposal</span>
                </Button>
              </>
            )}

            {isRejected && (
              <div className="text-xs text-rose-700 font-medium bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                Revision In Progress
              </div>
            )}

            {isExpired && (
              <div className="text-xs text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                Offer Expired
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign & Accept Modal with Digital Signature Pad */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="max-w-lg bg-white text-slate-900 rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Sign & Confirm Booking
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Complete your digital signature below to officially confirm this photography assignment with {studioName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Proposal Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Proposal Ref:</span>
                <span className="font-mono font-bold text-slate-800">{quoteRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Net Investment:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(grandTotal, 'INR')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-amber-800 font-medium">Advance Deposit Required:</span>
                <span className="font-mono font-bold text-amber-900">
                  {formatMoney(advanceRequired, 'INR')}
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

            {/* HTML5 Canvas Digital Signature Pad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5 text-slate-600" />
                  Draw Digital Signature *
                </label>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eraser className="w-3 h-3" />
                    Clear & Redraw
                  </button>
                )}
              </div>

              <div className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 rounded-xl overflow-hidden touch-none transition-colors">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  className="w-full h-32 bg-white cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                />

                {/* Base signature baseline indicator */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-300 pointer-events-none flex justify-between items-center text-[10px] text-slate-400 select-none pb-0.5">
                  <span>Sign on the line above</span>
                  <span className="font-mono">✕</span>
                </div>

                {!hasSignature && !isDrawing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 gap-1.5 select-none">
                    <PenLine className="w-4 h-4 opacity-50" />
                    <span>Use mouse, finger, or stylus to sign</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Your IP address and digital timestamp are recorded with this acceptance for legal verification.
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Additional Notes or Timing Requests (Optional)
              </label>
              <Textarea
                placeholder="Specific venue details, timing requests, or points of contact..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none text-slate-900 bg-white border-slate-300 placeholder:text-slate-400 focus-visible:ring-emerald-500 dark:text-slate-900 dark:bg-white dark:border-slate-300 dark:placeholder:text-slate-400"
              />
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                I have reviewed the scope of deliverables, understand the deposit terms, and agree to the studio payment policies stated in this proposal.
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              disabled={!hasSignature || !termsAgreed || isSubmittingAccept}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSubmittingAccept ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Confirming Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sign & Confirm Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Terms & Studio Payment Instructions Modal */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-2">
              <Landmark className="w-6 h-6 text-emerald-700" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Booking Confirmed & Deposit Terms
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Thank you for approving the proposal! To lock the shoot dates on our production schedule, please complete the advance deposit below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Advance Amount Highlight Card */}
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  Advance Deposit Due
                </p>
                <p className="text-xs text-amber-900 font-medium">
                  50% Booking Retainer
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-black text-amber-950">
                  {formatMoney(advanceRequired, 'INR')}
                </span>
                <p className="text-[10px] text-amber-800/80">of {formatMoney(grandTotal, 'INR')} total</p>
              </div>
            </div>

            {/* Fallback when banking details are missing */}
            {!hasBankingDetails && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Landmark className="w-4 h-4 text-slate-600" />
                  <span>Payment Instructions</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">
                  Payment instructions and banking details will be shared directly by the studio team.
                </p>
              </div>
            )}

            {/* UPI Payment Box */}
            {hasBankingDetails && upiId && (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    Instant UPI Transfer
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(upiId, 'UPI ID')}
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    Copy UPI
                  </Button>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg font-mono font-bold text-slate-900 text-center tracking-wide">
                  {upiId}
                </div>
              </div>
            )}

            {/* Bank Transfer Details Box */}
            {hasBankingDetails && bankDetailsText && (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-slate-600" />
                    Direct Bank Wire / NEFT
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(bankDetailsText, 'Bank details')}
                    className="h-7 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 px-2 gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Details
                  </Button>
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-lg font-mono text-slate-700 whitespace-pre-line text-[11px] leading-relaxed">
                  {bankDetailsText}
                </div>
              </div>
            )}

            {/* Post-Payment Instruction */}
            <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-indigo-950 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Next Steps after Transfer:
              </p>
              <p className="text-indigo-900 leading-normal">
                Please share your payment transaction UTR or screenshot
                {studioPhone ? (
                  <> via WhatsApp to <span className="font-semibold">{studioPhone}</span></>
                ) : null}
                {studioEmail ? (
                  <>{studioPhone ? ' or ' : ' via '}Email to <span className="font-semibold">{studioEmail}</span></>
                ) : null}
                {!studioPhone && !studioEmail ? ' directly with our studio team' : null} referencing quote{' '}
                <span className="font-bold font-mono">{quoteRef}</span>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setDepositDialogOpen(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Done & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={changesDialogOpen} onOpenChange={setChangesDialogOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
              <Edit3 className="w-6 h-6 text-indigo-700" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Request Quotation Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Let us know what modifications, deliverable additions, or schedule adjustments you need. Our team will review and update the proposal accordingly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Required Changes / Comments *
              </label>
              <Textarea
                placeholder="E.g., We would like to add aerial drone coverage, or adjust the coverage hours on the wedding day..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="text-xs text-slate-900 bg-white border-slate-300 placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:text-slate-900 dark:bg-white dark:border-slate-300 dark:placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Note: Submitting will notify the studio administration. You cannot edit line item pricing directly.
            </p>
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
                  Submitting Request...
                </>
              ) : (
                'Submit Changes Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
