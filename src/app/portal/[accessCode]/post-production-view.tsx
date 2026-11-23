'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  Camera,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Copy,
  HardDrive,
  FileCheck,
  Send,
  AlertCircle,
  HelpCircle,
  Layers,
  Wand2,
  Film,
  Building,
} from 'lucide-react';
import { JourneyTracker } from '@/components/portal/journey-tracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ClientVideoDeliverablesView } from '@/components/features/portal/video-review/client-video-deliverables-view';
import { submitClientSelectionAction } from '@/actions/post-production.actions';
import { PostProductionStatus, TaskStatus } from '@prisma/client';

interface PostProductionViewProps {
  customer: any;
  tenant: any;
  booking: any;
  job: any;
  selection: any;
  deliverableTasks: any[];
  videoTasks?: any[];
  accessCode: string;
}

export function PostProductionView({
  customer,
  tenant,
  booking,
  job,
  selection,
  deliverableTasks = [],
  videoTasks = [],
  accessCode,
}: PostProductionViewProps) {
  const [photoInput, setPhotoInput] = useState(selection?.selectedPhotoNames || '');
  const [clientNotes, setClientNotes] = useState(selection?.instructions || '');
  const [submittedSelection, setSubmittedSelection] = useState<any>(selection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Parse photos count
  const detectedPhotos = useMemo(() => {
    if (!photoInput.trim()) return [];
    return photoInput
      .split(/[\n,;]+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);
  }, [photoInput]);

  const hasSubmitted = Boolean(submittedSelection?.submittedAt);

  const handleSubmitSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedPhotos.length === 0) {
      toast.error('Please enter at least one photo filename or number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitClientSelectionAction({
        accessCode,
        jobId: job?.id,
        bookingId: booking?.id,
        photoNames: detectedPhotos.join(', '),
        clientNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to submit photo selections');
        return;
      }

      setSubmittedSelection(res.data.selection);
      toast.success('Photo selections submitted successfully!', {
        description: `Submitted ${detectedPhotos.length} photos. Our retouching and album design team has been notified.`,
      });
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while submitting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast.success('Vault link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sDate = formatDate(booking?.startDate, 'dd MMM yyyy');
  const eDate = booking?.endDate ? formatDate(booking.endDate, 'dd MMM yyyy') : null;
  const dateFormatted = eDate && eDate !== sDate ? `${sDate} to ${eDate}` : sDate;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-12 w-12 rounded-xl object-contain"
                />
              ) : (
                (tenant?.name || 'P')[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{tenant?.name || 'Pratima Photography Studio'}</h1>
              <p className="text-xs text-muted-foreground">Client Post-Production & Delivery Portal</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-xs text-muted-foreground">Welcome back,</span>
            <div className="text-sm font-semibold text-foreground">
              {customer?.firstName} {customer?.lastName}
            </div>
          </div>
        </div>

        {/* Real-time Journey Tracker */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Badge variant="outline" className="font-mono text-xs mb-1">
                  {booking?.bookingNumber}
                </Badge>
                <CardTitle className="text-xl font-bold">{booking?.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {dateFormatted}
                  </span>
                  {booking?.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {booking.location}
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>

              <Badge
                className={
                  job?.status === PostProductionStatus.DELIVERED
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-primary/10 text-primary border-primary/30'
                }
              >
                {job?.status ? job.status.replace(/_/g, ' ') : 'IN PRODUCTION'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <JourneyTracker
              status={booking?.journeyStatus || 'SHOOT_COMPLETED'}
              bookingTitle={booking?.title}
              eventDate={dateFormatted}
              location={booking?.location}
            />
          </CardContent>
        </Card>

        {/* Master Cloud Delivery Vault (if available) */}
        {job?.cloudFolderLink && (
          <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-lg font-bold text-foreground">
                      Your Master High-Resolution Vault is Ready!
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    All edited photographs, films, and raw footage files are available for download in your private cloud storage folder.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(job.cloudFolderLink)}
                    className="h-9 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {isCopied ? 'Copied!' : 'Copy Link'}
                  </Button>

                  <a
                    href={job.cloudFolderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 inline-flex items-center justify-center rounded-lg px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    <HardDrive className="h-3.5 w-3.5 mr-1.5" />
                    Open Cloud Vault
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two-Column Grid: Photo Selection vs. Deliverables Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Client Photo Selection Form */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/80 shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Album Photo Shortlist & Selection</CardTitle>
                      <CardDescription className="text-xs">
                        Select your favorite captures for album design and signature retouching.
                      </CardDescription>
                    </div>
                  </div>

                  {hasSubmitted && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Submitted
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmitSelection} className="space-y-4">
                  {hasSubmitted && (
                    <div className="p-3.5 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs space-y-1">
                      <div className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4" />
                        <span>Selection received on {formatDate(submittedSelection.submittedAt, 'dd MMM yyyy, hh:mm a')}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        You submitted {detectedPhotos.length} photos. You can update or add more below at any time before printing.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="photo-list" className="text-xs font-semibold">
                        Enter Shortlisted Photo Filenames / Numbers *
                      </Label>
                      <span className="text-xs font-semibold text-primary">
                        {detectedPhotos.length} Photo{detectedPhotos.length === 1 ? '' : 's'} Detected
                      </span>
                    </div>

                    <Textarea
                      id="photo-list"
                      rows={6}
                      placeholder="e.g. DSC_0012, DSC_0045, DSC_0102, IMG_9821 or paste numbers from your selection sheet..."
                      value={photoInput}
                      onChange={(e) => setPhotoInput(e.target.value)}
                      className="font-mono text-xs leading-relaxed"
                      required
                    />

                    <p className="text-[11px] text-muted-foreground">
                      Tip: You can separate photo numbers using commas, spaces, or newlines.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client-notes" className="text-xs font-semibold">
                      Design Notes & Special Requests
                    </Label>
                    <Textarea
                      id="client-notes"
                      rows={3}
                      placeholder="e.g. Please feature the family stage shots prominently in the opening spread. Warm pastel skin tones preferred."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      'Submitting Selections...'
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {hasSubmitted ? 'Update Photo Selections' : 'Submit Photo Selections for Editing'}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Deliverables Pipeline Status */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Film className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Deliverable Milestones</CardTitle>
                    <CardDescription className="text-xs">
                      Live tracking of films, reels, and album printing.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {deliverableTasks.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Deliverables are being prepared by the production team.
                  </div>
                ) : (
                  deliverableTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {task.taskType.replace(/_/g, ' ')}
                        </div>
                        {task.dueDate && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Target: {formatDate(task.dueDate, 'dd MMM yyyy')}
                          </div>
                        )}
                      </div>

                      <Badge
                        className={
                          task.status === TaskStatus.COMPLETED
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : task.status === TaskStatus.IN_PROGRESS
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : task.status === TaskStatus.REVIEW
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))
                )}

                {/* Help Note */}
                <div className="pt-2">
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      Need Assistance?
                    </div>
                    <p className="text-[11px]">
                      Contact your dedicated studio coordinator at{' '}
                      <span className="font-medium text-foreground">{tenant?.phone || 'our desk'}</span> or reply to our WhatsApp updates.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cinematic Video Review & Approval Section */}
        {((videoTasks && videoTasks.length > 0) || deliverableTasks.some((t: any) => t.previewUrl)) && (
          <div className="pt-2">
            <ClientVideoDeliverablesView
              videoTasks={videoTasks && videoTasks.length > 0 ? videoTasks : deliverableTasks.filter((t: any) => t.previewUrl)}
              studioName={tenant?.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}
