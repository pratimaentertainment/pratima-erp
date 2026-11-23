'use client';

import * as React from 'react';
import { formatDate } from '@/lib/date';
import {
  ShieldCheck,
  Lock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Camera,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HardDrive,
  FileText,
  Check,
  Loader2,
  Sparkles,
  Navigation,
  Send,
  ArrowRight,
  RefreshCw,
  User,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  verifyCrewPassPin,
  markCrewVenueCheckIn,
  submitCrewDataHandover,
  type CrewPassPreviewData,
  type CrewPassStatus,
  type SanitizedCrewPass,
} from '@/actions/crew-portal.actions';

export interface CrewPassClientProps {
  token: string;
  preview: {
    success: boolean;
    status: CrewPassStatus;
    error?: string;
    data?: CrewPassPreviewData;
  };
}

export function CrewPassClient({ token, preview }: CrewPassClientProps) {
  // Gate PIN state
  const [pin, setPin] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [passData, setPassData] = React.useState<SanitizedCrewPass | null>(null);

  // Field actions state
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [gearCheckedMap, setGearCheckedMap] = React.useState<Record<string, boolean>>({});

  // Data handover form state
  const [showHandoverForm, setShowHandoverForm] = React.useState(false);
  const [mediaCardsCount, setMediaCardsCount] = React.useState<string>('2');
  const [rawMediaSizeGb, setRawMediaSizeGb] = React.useState<string>('64');
  const [fieldHandoverNotes, setFieldHandoverNotes] = React.useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = React.useState(false);

  // 1. PIN Verification Gate Handler
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.replace(/\D/g, '').trim();

    if (cleanPin.length !== 4) {
      toast.error('Please enter the exact last 4 digits of your phone number.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyCrewPassPin(token, cleanPin);
      if (!res.success || !res.data) {
        toast.error(res.error || 'Verification failed. Incorrect PIN.');
        return;
      }

      setPassData(res.data);
      if (res.data.mediaCardsCount) {
        setMediaCardsCount(String(res.data.mediaCardsCount));
        setRawMediaSizeGb(res.data.rawMediaSizeGb ? String(res.data.rawMediaSizeGb) : '');
        setFieldHandoverNotes(res.data.fieldHandoverNotes || '');
      }
      toast.success(`Welcome, ${res.data.crewName}! Event pass unlocked.`);
    } catch (err: any) {
      toast.error(err.message || 'Verification error. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Venue Arrival Check-in Handler
  const handleCheckIn = async () => {
    if (!pin) return;
    setIsCheckingIn(true);
    try {
      const res = await markCrewVenueCheckIn(token, pin);
      if (!res.success) {
        toast.error(res.error || 'Failed to record check-in.');
        return;
      }

      toast.success('Venue check-in successfully recorded!');
      if (passData && res.checkedInAt) {
        setPassData({ ...passData, checkedInAt: res.checkedInAt });
      }
    } catch (err: any) {
      toast.error(err.message || 'Check-in error.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // 3. Post-Shoot Data Handover Submission Handler
  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    const cardsNum = parseInt(mediaCardsCount, 10);
    if (isNaN(cardsNum) || cardsNum < 1) {
      toast.error('Please specify at least 1 memory card.');
      return;
    }

    const gbNum = rawMediaSizeGb ? parseFloat(rawMediaSizeGb) : undefined;

    setIsSubmittingHandover(true);
    try {
      const res = await submitCrewDataHandover(token, pin, {
        mediaCardsCount: cardsNum,
        rawMediaSizeGb: gbNum,
        fieldHandoverNotes: fieldHandoverNotes.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to submit handover details.');
        return;
      }

      toast.success(res.message || 'Media handover recorded successfully!');
      if (passData) {
        setPassData({
          ...passData,
          mediaCardsCount: cardsNum,
          rawMediaSizeGb: gbNum || null,
          fieldHandoverNotes: fieldHandoverNotes.trim() || null,
        });
      }
      setShowHandoverForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Error submitting handover.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  // Toggle Gear Checklist Checkbox
  const toggleGearCheck = (gearId: string) => {
    setGearCheckedMap((prev) => ({ ...prev, [gearId]: !prev[gearId] }));
  };

  // STATE 1: Expired, Revoked, or Invalid Token
  if (!preview.success || preview.status !== 'VALID' || !preview.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 selection:bg-primary/20">
        <div className="max-w-md w-full mx-auto my-auto space-y-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Badge
              variant="outline"
              className="border-destructive/30 text-destructive bg-destructive/10 text-xs font-bold uppercase tracking-wider"
            >
              Pass {preview.status}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">
              Event Shoot Pass Inactive
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {preview.error || 'This digital pass is no longer active or has expired.'}
            </p>
          </div>

          <Card className="bg-card/60 backdrop-blur-xs border-border/80 text-left p-4 space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              Need Access or Assistance?
            </h4>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Please reach out directly to your studio operations coordinator to request a renewed event pass.
            </p>
          </Card>
        </div>

        <footer className="text-center text-[11px] text-muted-foreground pt-4">
          Pratima ERP • Field Crew Magic Link Engine
        </footer>
      </div>
    );
  }

  const previewData = preview.data;

  // STATE 2: 4-Digit Mobile Verification Gate
  if (!passData) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 selection:bg-primary/20">
        {/* Subtle Ambient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Studio Branding */}
        <div className="max-w-sm w-full mx-auto text-center pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{previewData.studioName}</span>
          </div>
        </div>

        {/* Verification Card */}
        <div className="max-w-sm w-full mx-auto my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-md">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground tracking-tight">
              Event Pass Verification
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hello <strong className="text-foreground">{previewData.crewName}</strong>, you have been assigned as{' '}
              <strong className="text-primary">{previewData.role}</strong> for{' '}
              <strong className="text-foreground">{previewData.functionName}</strong>.
            </p>
          </div>

          <Card className="shadow-md border-border/80">
            <CardContent className="p-5 space-y-4">
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block text-center">
                    Enter Last 4 Digits of Your Phone
                  </label>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Registered Mobile: <span className="font-mono font-bold text-foreground">{previewData.maskedPhone}</span>
                  </p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="••••"
                    autoFocus
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full text-center text-3xl font-black font-mono tracking-widest h-14 rounded-xl border border-input bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all text-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isVerifying || pin.length !== 4}
                  className="w-full text-xs h-10 font-bold gap-2 shadow-xs"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Unlock Shoot Pass</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-2 border-t text-center">
                <p className="text-[10px] text-muted-foreground">
                  🔒 Encrypted Freelancer Magic Link • Protected by 4-digit mobile verification gate
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="text-center text-[11px] text-muted-foreground pb-2">
          {previewData.studioName} • Powered by Pratima ERP
        </footer>
      </div>
    );
  }

  // STATE 3: Active Event Pass Dashboard
  const subEvent = passData.subEvent;
  const isCheckedIn = Boolean(passData.checkedInAt);
  const hasHandover = Boolean(passData.mediaCardsCount);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 selection:bg-primary/20">
      <div className="max-w-lg w-full mx-auto space-y-5 pb-8">
        {/* Top Header Identity */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center font-heading shadow-xs">
              P
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground leading-none">{passData.studio.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Official Field Shoot Pass</p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-bold uppercase"
          >
            Verified Pass
          </Badge>
        </div>

        {/* Function Hero Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
                  {passData.role}
                </Badge>
                <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground tracking-tight pt-1">
                  {subEvent.name}
                </h1>
                <p className="text-xs font-medium text-muted-foreground">
                  {passData.eventTitle} (#{passData.bookingNumber})
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mx-auto">
                  {(passData.crewName || 'C').slice(0, 2).toUpperCase()}
                </div>
                <p className="text-[10px] font-bold text-foreground mt-1 truncate max-w-[80px]">
                  {passData.crewName}
                </p>
              </div>
            </div>

            {/* Time & Date Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Shoot Date</p>
                  <p className="font-bold text-foreground truncate">
                    {formatDate(subEvent.eventDate, 'dd MMM yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Call Times</p>
                  <p className="font-bold text-foreground truncate">
                    {subEvent.startTime} - {subEvent.endTime}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Field Status / Check-in Banner */}
        <div className="space-y-2">
          {isCheckedIn ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    Venue Arrival Confirmed
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
                    Recorded on {formatDate(passData.checkedInAt!, 'dd MMM, hh:mm a')}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                Checked In
              </Badge>
            </div>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full text-xs h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isCheckingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Venue Check-in...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>I Have Arrived at Venue (Check-in)</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Venue Location & Navigation */}
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Venue &amp; Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <p className="text-sm font-bold text-foreground">
              {subEvent.locationVenue || 'Studio / Location to be finalized'}
            </p>

            {subEvent.locationVenue && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  subEvent.locationVenue
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Studio Coordinator Contact Card */}
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Studio Production Coordinator
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-foreground">{passData.studio.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {passData.studio.coordinatorPhone || 'Desk Contact Available'}
              </p>
            </div>

            {passData.studio.coordinatorPhone && (
              <a
                href={`tel:${passData.studio.coordinatorPhone}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-2xs hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>Call Studio</span>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Reserved Equipment & Gear Checklist */}
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Allocated Gear Checklist
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {passData.gear.length} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {passData.gear.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Standard baseline kit. No serialized inventory reserved.
              </p>
            ) : (
              passData.gear.map((g) => {
                const isChecked = Boolean(gearCheckedMap[g.id]);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGearCheck(g.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors gap-3 select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate transition-all ${
                            isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {g.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {g.category} • SN: {g.serialNumber || g.assetTag || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      {g.category}
                    </Badge>
                  </div>
                );
              })
            )}
            <p className="text-[10px] text-muted-foreground pt-1 text-center">
              Tap any item above to verify and check off your kit before shoot departure.
            </p>
          </CardContent>
        </Card>

        {/* Post-Shoot Media Handover Desk */}
        <Card className="shadow-2xs border-dashed border-primary/30">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                Post-Shoot Data Handover Desk
              </CardTitle>
              {hasHandover && (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Submitted
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Log SD/CFexpress memory cards and raw footage size before handover.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-3">
            {hasHandover && !showHandoverForm ? (
              <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Cards Handed Over:
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {passData.mediaCardsCount} Cards
                  </span>
                </div>
                {passData.rawMediaSizeGb && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Raw Media Size:
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {passData.rawMediaSizeGb} GB
                    </span>
                  </div>
                )}
                {passData.fieldHandoverNotes && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                    &ldquo;{passData.fieldHandoverNotes}&rdquo;
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHandoverForm(true)}
                  className="w-full text-xs h-8 mt-2"
                >
                  Edit / Update Handover Details
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitHandover} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">
                      Memory Cards Count *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={mediaCardsCount}
                      onChange={(e) => setMediaCardsCount(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">
                      Approx. Size (GB)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 128"
                      value={rawMediaSizeGb}
                      onChange={(e) => setRawMediaSizeGb(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    Handover Notes / Card Sequence
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Card 1 (Sony 128GB) contains Haldi candid shots..."
                    value={fieldHandoverNotes}
                    onChange={(e) => setFieldHandoverNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-md border bg-background text-foreground resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingHandover}
                  className="w-full text-xs h-9 font-bold gap-1.5"
                >
                  {isSubmittingHandover ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Handover Details...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm Media Handover</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-[10px] text-muted-foreground pb-2 max-w-sm mx-auto">
        Pratima Studio ERP • Strict Privacy &amp; Zero Financial Leak Gate
      </footer>
    </div>
  );
}
