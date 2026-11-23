'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestLeadSchema, type GuestLeadFormValues } from '@/schemas/guest-lead.schema';
import { submitGuestLeadAction } from '@/actions/guest.actions';
import { formatDate } from '@/lib/date';
import {
  Camera,
  CheckCircle2,
  Sparkles,
  Phone,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export interface ActiveEventOption {
  id: string;
  title: string;
  bookingNumber: string;
  startDate: Date | string;
  location?: string | null;
}

export interface GuestLeadFormProps {
  tenantId: string;
  studioName: string;
  studioLogoUrl?: string | null;
  activeEvents: ActiveEventOption[];
}

/**
 * Resizes an image file in the browser canvas to maintain high facial recognition accuracy
 * while keeping the base64 payload under 300KB for lightning-fast mobile uploads.
 */
function compressImage(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function GuestLeadForm({
  tenantId,
  studioName,
  studioLogoUrl,
  activeEvents,
}: GuestLeadFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [submittedData, setSubmittedData] = React.useState<{
    guestName: string;
    whatsappNumber: string;
    eventTitle?: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);

  // Default to the first event if only 1 event is active
  const defaultBookingId = activeEvents.length === 1 ? activeEvents[0].id : '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GuestLeadFormValues>({
    resolver: zodResolver(guestLeadSchema),
    defaultValues: {
      bookingId: defaultBookingId,
      guestName: '',
      whatsappNumber: '',
      selfieImage: '',
    },
  });

  const selectedBookingId = watch('bookingId');
  const selfieValue = watch('selfieImage');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setSubmissionError(null);
      const compressedDataUrl = await compressImage(file, 1200, 0.85);
      setPreviewUrl(compressedDataUrl);
      setValue('selfieImage', compressedDataUrl, { shouldValidate: true });
    } catch (err: any) {
      console.error('Image compression error:', err);
      setSubmissionError('Failed to process selfie image. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setValue('selfieImage', '', { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onSubmit = async (values: GuestLeadFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const res = await submitGuestLeadAction(values, tenantId);

      if (!res.success) {
        setSubmissionError(res.error || 'Failed to submit details. Please try again.');
        return;
      }

      setSubmittedData({
        guestName: values.guestName,
        whatsappNumber: res.data?.whatsappNumber || values.whatsappNumber,
        eventTitle: res.data?.eventTitle,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setSubmissionError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherGuest = () => {
    reset({
      bookingId: defaultBookingId,
      guestName: '',
      whatsappNumber: '',
      selfieImage: '',
    });
    setPreviewUrl(null);
    setIsSuccess(false);
    setSubmittedData(null);
    setSubmissionError(null);
  };

  // ---------------------------------------------------------------------------
  // 1. SUCCESS CELEBRATION VIEW
  // ---------------------------------------------------------------------------
  if (isSuccess && submittedData) {
    return (
      <div className="bg-card border border-border shadow-xl rounded-2xl p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="relative mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-12 h-12" />
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-1 rounded-full shadow">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            You&apos;re All Set, {submittedData.guestName}!
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your reference selfie has been registered. Our AI face matching engine is actively scanning the event gallery.
          </p>
        </div>

        <div className="bg-muted/40 border rounded-xl p-4 text-left space-y-3 text-xs">
          {submittedData.eventTitle && (
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Event
              </span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {submittedData.eventTitle}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Delivery
            </span>
            <span className="font-mono font-semibold text-foreground">
              +{submittedData.whatsappNumber}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Match Status
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Indexing Queued
            </span>
          </div>
        </div>

        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-muted-foreground text-left flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <span>
            Once the photography team finishes uploading, your matched photos will be delivered straight to your WhatsApp.
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetForAnotherGuest}
          className="w-full py-3 px-4 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm text-foreground transition-all flex items-center justify-center gap-2"
        >
          <User className="w-4 h-4" /> Register Another Guest
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. LEAD CAPTURE FORM VIEW (Mobile-First)
  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-card border border-border shadow-xl rounded-2xl p-5 sm:p-7 space-y-5"
    >
      {/* Hidden Mobile Camera Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
        id="camera-selfie-input"
      />

      {/* Global Error Banner */}
      {submissionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Field 1: Event Selection Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          Select Event / Wedding
        </label>
        {activeEvents.length > 0 ? (
          <select
            {...register('bookingId')}
            className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          >
            <option value="">-- Choose your event --</option>
            {activeEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({formatDate(evt.startDate)})
              </option>
            ))}
          </select>
        ) : (
          <div className="p-2.5 rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/20">
            Universal Studio Guest Mode &bull; {studioName}
          </div>
        )}
        {errors.bookingId && (
          <p className="text-[11px] text-rose-500">{errors.bookingId.message}</p>
        )}
      </div>

      {/* Field 2: Guest Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          Your Full Name
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            {...register('guestName')}
            className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
        </div>
        {errors.guestName && (
          <p className="text-[11px] text-rose-500">{errors.guestName.message}</p>
        )}
      </div>

      {/* Field 3: WhatsApp Mobile Number */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp Number
          </span>
          <span className="text-[10px] text-muted-foreground">For photo delivery</span>
        </label>
        <div className="relative flex rounded-xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
          <div className="bg-muted px-3 flex items-center text-xs font-semibold text-muted-foreground border-r border-input">
            🇮🇳 +91
          </div>
          <input
            type="tel"
            placeholder="98765 43210"
            maxLength={14}
            {...register('whatsappNumber')}
            className="w-full h-11 px-3 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>
        {errors.whatsappNumber && (
          <p className="text-[11px] text-rose-500">{errors.whatsappNumber.message}</p>
        )}
      </div>

      {/* Field 4: Selfie Upload / Camera Capture */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-primary" />
            Your Reference Selfie (AI Face Scan)
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3" /> Private & Secure
          </span>
        </label>

        {previewUrl ? (
          <div className="relative border-2 border-emerald-500/40 bg-muted/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selfie preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold py-0.5 uppercase tracking-wider">
                Face Ready
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retake Selfie
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2 group active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
              {isCompressing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                Tap to Take a Selfie
              </p>
              <p className="text-[11px] text-muted-foreground">
                Opens front camera on mobile devices
              </p>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground shadow-sm mt-1">
              <Sparkles className="w-3 h-3 mr-1" /> AI Face Recognition
            </span>
          </div>
        )}

        {errors.selfieImage && (
          <p className="text-[11px] text-rose-500">{errors.selfieImage.message}</p>
        )}
      </div>

      {/* Submit Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isCompressing}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering with AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Find My Event Photos</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Your selfie is used strictly for event photo identification &bull; Never shared publicly.
        </p>
      </div>
    </form>
  );
}
