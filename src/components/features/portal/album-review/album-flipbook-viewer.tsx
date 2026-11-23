'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Send,
  MessageSquare,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlbumReviewHeader } from './album-review-header';
import { AlbumSpreadPage, AlbumPageSpread } from './album-spread-page';
import { PinCommentModal } from './pin-comment-modal';
import {
  resolveAlbumCommentAction,
  deleteAlbumCommentAction,
  clientReviewAlbumAction,
  getAlbumProofingAction,
} from '@/actions/album.actions';
import { AlbumStatus } from '@prisma/client';

interface AlbumFlipbookViewerProps {
  initialAlbum: any;
  accessCode?: string | null;
  backUrl?: string;
}

export function AlbumFlipbookViewer({
  initialAlbum,
  accessCode,
  backUrl = '/portal/dashboard',
}: AlbumFlipbookViewerProps) {
  const [album, setAlbum] = useState<any>(initialAlbum);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState<number>(0);
  const [isPinDropMode, setIsPinDropMode] = useState<boolean>(false);
  const [activePinCoords, setActivePinCoords] = useState<{ xPos: number; yPos: number } | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sign-off modal states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState<boolean>(false);
  const [isChangesDialogOpen, setIsChangesDialogOpen] = useState<boolean>(false);
  const [clientFeedbackText, setClientFeedbackText] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const pages: AlbumPageSpread[] = album?.pages || [];
  const currentSpread: AlbumPageSpread | undefined = pages[currentSpreadIndex];
  const totalSpreads = pages.length;

  // Unresolved comments across all pages
  const totalUnresolved = pages.reduce(
    (sum, p) => sum + (p.comments?.filter((c) => !c.isResolved).length || 0),
    0
  );

  // Spread Navigation Handlers
  const handleNextSpread = useCallback(() => {
    if (currentSpreadIndex < totalSpreads - 1) {
      setCurrentSpreadIndex((prev) => prev + 1);
      setSelectedCommentId(null);
    }
  }, [currentSpreadIndex, totalSpreads]);

  const handlePrevSpread = useCallback(() => {
    if (currentSpreadIndex > 0) {
      setCurrentSpreadIndex((prev) => prev - 1);
      setSelectedCommentId(null);
    }
  }, [currentSpreadIndex]);

  // Keyboard Navigation: Left/Right arrows
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextSpread();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevSpread();
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPinDropMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPinDropMode(false);
        setSelectedCommentId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSpread, handlePrevSpread]);

  // Fullscreen Handlers
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Spatial Pin Click Callback
  const handleSpreadClick = (coords: { xPos: number; yPos: number }) => {
    setActivePinCoords(coords);
    setIsPinModalOpen(true);
    setIsPinDropMode(false); // turn off pin drop mode once clicked
  };

  // On Pin Comment Created Successfully
  const handleCommentCreated = (newComment: any) => {
    // Optimistically insert new comment into active spread
    setAlbum((prev: any) => {
      const updatedPages = prev.pages.map((p: any, idx: number) => {
        if (idx === currentSpreadIndex) {
          const updatedComments = [...(p.comments || []), newComment];
          return {
            ...p,
            comments: updatedComments,
            commentsCount: updatedComments.length,
            unresolvedCount: updatedComments.filter((c: any) => !c.isResolved).length,
          };
        }
        return p;
      });

      return {
        ...prev,
        pages: updatedPages,
        status:
          prev.status === AlbumStatus.SHARED_FOR_REVIEW
            ? AlbumStatus.CHANGES_REQUESTED
            : prev.status,
      };
    });

    setSelectedCommentId(newComment.id);
  };

  // On Pin Resolved / Reopened
  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const res = await resolveAlbumCommentAction({
        commentId,
        isResolved,
        accessCode,
      });

      if (res.success) {
        toast.success(res.message);
        setAlbum((prev: any) => {
          const updatedPages = prev.pages.map((p: any) => ({
            ...p,
            comments: p.comments.map((c: any) =>
              c.id === commentId ? { ...c, isResolved } : c
            ),
          }));
          return { ...prev, pages: updatedPages };
        });
      } else {
        toast.error(res.error || 'Failed to update comment status.');
      }
    } catch {
      toast.error('Network error updating comment pin.');
    }
  };

  // On Pin Deleted
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await deleteAlbumCommentAction({ commentId, accessCode });
      if (res.success) {
        toast.success(res.message);
        setAlbum((prev: any) => {
          const updatedPages = prev.pages.map((p: any) => ({
            ...p,
            comments: p.comments.filter((c: any) => c.id !== commentId),
          }));
          return { ...prev, pages: updatedPages };
        });
        setSelectedCommentId(null);
      } else {
        toast.error(res.error || 'Failed to delete comment pin.');
      }
    } catch {
      toast.error('Network error deleting comment pin.');
    }
  };

  // Client Review: Approve Album for Print
  const handleConfirmApproval = () => {
    startTransition(async () => {
      try {
        const res = await clientReviewAlbumAction({
          albumId: album.id,
          isApproved: true,
          feedbackNotes: clientFeedbackText.trim() || undefined,
          accessCode,
        });

        if (res.success && res.data) {
          toast.success('Digital album officially approved for print!');
          setAlbum((prev: any) => ({
            ...prev,
            status: AlbumStatus.APPROVED_FOR_PRINT,
          }));
          setIsApproveDialogOpen(false);
        } else {
          toast.error(res.error || 'Failed to submit album approval.');
        }
      } catch (err: any) {
        console.error('Approve album error:', err);
        toast.error('Unexpected error submitting approval.');
      }
    });
  };

  // Client Review: Request Changes
  const handleConfirmChanges = () => {
    startTransition(async () => {
      try {
        const res = await clientReviewAlbumAction({
          albumId: album.id,
          isApproved: false,
          feedbackNotes: clientFeedbackText.trim() || undefined,
          accessCode,
        });

        if (res.success && res.data) {
          toast.success('Layout revision request sent to album designer.');
          setAlbum((prev: any) => ({
            ...prev,
            status: AlbumStatus.CHANGES_REQUESTED,
          }));
          setIsChangesDialogOpen(false);
          setClientFeedbackText('');
        } else {
          toast.error(res.error || 'Failed to submit change requests.');
        }
      } catch (err: any) {
        console.error('Request changes error:', err);
        toast.error('Unexpected error submitting changes.');
      }
    });
  };

  if (!currentSpread || pages.length === 0) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-sm space-y-3">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
          <h2 className="text-lg font-bold text-foreground">No Album Spreads Uploaded Yet</h2>
          <p className="text-xs text-muted-foreground">
            Our album layout designers are assembling the panoramic spreads for this photobook.
            Please check back shortly or contact your studio coordinator.
          </p>
          <div className="pt-2">
            <a
              href={backUrl}
              className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
            >
              Return to Portal Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none">
      {/* 1. Sticky Review Navigation Header */}
      <AlbumReviewHeader
        albumTitle={album.title}
        bookingTitle={album.eventBooking?.title}
        currentSpread={currentSpread.pageNumber}
        totalSpreads={totalSpreads}
        status={album.status}
        unresolvedCommentsCount={totalUnresolved}
        isPinDropMode={isPinDropMode}
        onTogglePinMode={() => setIsPinDropMode((prev) => !prev)}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
        onZoomOut={() => setZoomLevel((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
        onResetZoom={() => setZoomLevel(1)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onApproveAlbum={() => setIsApproveDialogOpen(true)}
        onRequestChanges={() => setIsChangesDialogOpen(true)}
        isPending={isPending}
        backUrl={backUrl}
      />

      {/* 2. Main Interactive Spread Flipbook Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrevSpread}
          disabled={currentSpreadIndex === 0}
          className={`absolute left-2 sm:left-4 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/10 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
            currentSpreadIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:scale-105'
          }`}
          title="Previous Spread (Left Arrow)"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Spread Book Canvas Component */}
        <div className="w-full flex items-center justify-center">
          <AlbumSpreadPage
            page={currentSpread}
            isPinDropMode={isPinDropMode}
            onSpreadClick={handleSpreadClick}
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            onResolveComment={handleResolveComment}
            onDeleteComment={handleDeleteComment}
            zoomLevel={zoomLevel}
          />
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNextSpread}
          disabled={currentSpreadIndex === totalSpreads - 1}
          className={`absolute right-2 sm:right-4 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/10 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
            currentSpreadIndex === totalSpreads - 1
              ? 'opacity-20 cursor-not-allowed'
              : 'opacity-80 hover:opacity-100 hover:scale-105'
          }`}
          title="Next Spread (Right Arrow)"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </main>

      {/* 3. Bottom Filmstrip / Thumbnails Bar */}
      <footer className="border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
            {pages.map((p, idx) => {
              const isCurrent = idx === currentSpreadIndex;
              const unresolvedOnPage = p.comments?.filter((c) => !c.isResolved).length || 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCurrentSpreadIndex(idx);
                    setSelectedCommentId(null);
                  }}
                  className={`group relative shrink-0 w-20 sm:w-24 aspect-[2/1] rounded-lg overflow-hidden border transition-all ${
                    isCurrent
                      ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md scale-105'
                      : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
                  }`}
                  title={`Spread #${p.pageNumber}`}
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={`Thumb ${p.pageNumber}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[9px] text-zinc-500 font-mono">
                      #{p.pageNumber}
                    </div>
                  )}

                  {/* Spread Number Badge */}
                  <span className="absolute bottom-1 left-1 z-10 text-[9px] font-mono font-bold bg-black/75 px-1 py-0.2 rounded text-white">
                    {p.pageNumber}
                  </span>

                  {/* Pin count badge on thumbnail */}
                  {unresolvedOnPage > 0 && (
                    <span className="absolute top-1 right-1 z-10 h-3.5 w-3.5 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center font-mono">
                      {unresolvedOnPage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-medium shrink-0">
            <span>Use <strong>&larr; &rarr;</strong> keys to flip spreads</span>
            <span>•</span>
            <span>Press <strong>P</strong> for Pin Mode</span>
          </div>
        </div>
      </footer>

      {/* 4. Drop Pin Comment Form Modal */}
      <PinCommentModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setActivePinCoords(null);
        }}
        pageId={currentSpread.id}
        pageNumber={currentSpread.pageNumber}
        coords={activePinCoords}
        accessCode={accessCode}
        defaultAuthorName={album.authContext?.userName}
        onSuccess={handleCommentCreated}
      />

      {/* 5. Approve for Print Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Approve Album for Print & Binding
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Once approved, your album spreads will be locked and sent directly to our master print lab for printing, color proofing, and hand binding.
            </DialogDescription>
          </DialogHeader>

          {totalUnresolved > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>You have {totalUnresolved} open comment pins</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Approving now will sign off the current layout design as final. Make sure all critical photo modifications have been satisfied.
              </p>
            </div>
          )}

          <div className="space-y-1.5 py-1">
            <span className="text-xs font-medium text-foreground">Sign-off Remarks (Optional):</span>
            <Textarea
              rows={3}
              placeholder="e.g. Layout looks magnificent! Approved for printing in luxury leatherette cover."
              value={clientFeedbackText}
              onChange={(e) => setClientFeedbackText(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmApproval}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              <span>{isPending ? 'Signing Off...' : 'Confirm Approval for Print'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Request Changes Dialog */}
      <Dialog open={isChangesDialogOpen} onOpenChange={setIsChangesDialogOpen}>
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <RotateCcw className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Submit Layout Changes to Designer
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Your layout designer will review your pin comments and adjust the spreads accordingly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Total Open Modification Pins:</span>
              <Badge variant="outline" className="font-mono text-xs font-semibold bg-background">
                {totalUnresolved} Pins Dropped
              </Badge>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
                Overall Revision Summary & Directions:
              </span>
              <Textarea
                rows={3}
                placeholder="e.g. Please check the pins on spread #4 and #8. Also ensure bride portrait skin tones are warm across the opening spreads."
                value={clientFeedbackText}
                onChange={(e) => setClientFeedbackText(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChangesDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmChanges}
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              <span>{isPending ? 'Submitting...' : 'Submit Revision Request'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
