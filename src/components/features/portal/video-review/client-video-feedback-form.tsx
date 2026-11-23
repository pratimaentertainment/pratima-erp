'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  MessageSquare,
  Sparkles,
  Download,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { clientReviewVideoAction } from '@/actions/video-editing.actions';
import { TaskStatus } from '@prisma/client';

interface ClientVideoFeedbackFormProps {
  taskId: string;
  taskTitle: string;
  currentStatus: TaskStatus;
  revisionsCount: number;
  existingFeedback?: string | null;
  deliveryUrl?: string | null;
  onActionCompleted?: () => void;
}

export function ClientVideoFeedbackForm({
  taskId,
  taskTitle,
  currentStatus: initialStatus,
  revisionsCount: initialRevisions,
  existingFeedback = null,
  deliveryUrl = null,
  onActionCompleted,
}: ClientVideoFeedbackFormProps) {
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [revisionsCount, setRevisionsCount] = useState<number>(initialRevisions);
  const [feedbackNotes, setFeedbackNotes] = useState<string>(existingFeedback || '');
  const [showRevisionForm, setShowRevisionForm] = useState<boolean>(
    initialStatus === TaskStatus.CHANGES_REQUESTED
  );
  const [isPending, startTransition] = useTransition();

  const isApproved =
    status === TaskStatus.APPROVED || status === TaskStatus.COMPLETED;

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await clientReviewVideoAction({
          taskId,
          isApproved: true,
          feedbackNotes: 'Approved by client via client portal.',
        });

        if (res.success) {
          toast.success('Video cut approved! Our studio master team has been notified.');
          setStatus(TaskStatus.APPROVED);
          setShowRevisionForm(false);
          if (onActionCompleted) onActionCompleted();
        } else {
          toast.error(res.error || 'Failed to submit approval.');
        }
      } catch (err: any) {
        console.error('Approval submission error:', err);
        toast.error('An unexpected error occurred while approving.');
      }
    });
  };

  const handleRequestChanges = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFeedback = feedbackNotes.trim();

    if (!cleanFeedback) {
      toast.error('Please enter details of the changes you would like our editor to make.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await clientReviewVideoAction({
          taskId,
          isApproved: false,
          feedbackNotes: cleanFeedback,
        });

        if (res.success) {
          toast.success(
            `Revision cycle #${revisionsCount + 1} logged. Our creative editor will begin modifications immediately.`
          );
          setStatus(TaskStatus.CHANGES_REQUESTED);
          setRevisionsCount((prev) => prev + 1);
          if (onActionCompleted) onActionCompleted();
        } else {
          toast.error(res.error || 'Failed to submit revision request.');
        }
      } catch (err: any) {
        console.error('Revision request error:', err);
        toast.error('An unexpected error occurred while requesting changes.');
      }
    });
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 1. APPROVED STATE BANNER */}
      {isApproved ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>You have officially approved this video cut!</span>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
              Signed Off
            </Badge>
          </div>

          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            Thank you for your approval. Our studio grading lab has finalized this deliverable.
          </p>

          {/* Master Download Button (UNLOCKED upon approval) */}
          {deliveryUrl ? (
            <div className="pt-1">
              <a
                href={deliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Master High-Resolution Cut (4K UHD)</span>
                <ExternalLink className="h-3 w-3 ml-1 opacity-80" />
              </a>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span>Final high-bitrate master download link will appear here once cloud encoding is ready.</span>
            </div>
          )}
        </div>
      ) : (
        /* 2. REVIEW & FEEDBACK ACTION BAR */
        <div className="space-y-3">
          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 backdrop-blur-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  Ready to provide feedback for &ldquo;{taskTitle}&rdquo;?
                </span>
                {revisionsCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-bold text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40">
                    Cycle #{revisionsCount}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Approve if the cut meets your expectations, or request timestamped modifications.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Request Changes Button */}
              <Button
                type="button"
                variant={showRevisionForm ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowRevisionForm((prev) => !prev)}
                disabled={isPending}
                className="h-8 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                <span>{showRevisionForm ? 'Close Feedback' : 'Request Changes'}</span>
              </Button>

              {/* Approve Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleApprove}
                disabled={isPending}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                <span>{isPending ? 'Submitting...' : 'Approve Video'}</span>
              </Button>
            </div>
          </div>

          {/* 3. REVISION REQUEST FORM (Revealed when Request Changes is clicked) */}
          {showRevisionForm && (
            <form
              onSubmit={handleRequestChanges}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-in fade-in-50 duration-200"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <span>Specific Modification Instructions for the Editor</span>
              </div>

              <Textarea
                rows={4}
                placeholder="Please describe what you would like changed. Mention timestamps where possible (e.g. 00:45 - shorten bride entry shot; 01:20 - increase music volume on vows; replace ending photo)..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="text-xs bg-background leading-relaxed"
                required
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>Submitting revision requests updates the editor workbench immediately.</span>
                </p>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRevisionForm(false)}
                    disabled={isPending}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !feedbackNotes.trim()}
                    className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    <span>{isPending ? 'Sending...' : 'Submit Revision Request'}</span>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
