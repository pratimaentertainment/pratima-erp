'use client';

import * as React from 'react';
import { Film, Lock, ShieldCheck, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClientVideoPlayer } from './client-video-player';
import { ClientVideoFeedbackForm } from './client-video-feedback-form';
import { formatDate } from '@/lib/date';
import { TaskStatus } from '@prisma/client';

export interface ClientVideoTask {
  id: string;
  type: string;
  taskType: string | null;
  status: TaskStatus;
  previewUrl: string | null;
  deliveryUrl: string | null;
  clientFeedback: string | null;
  revisionsCount: number;
  dueDate: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface ClientVideoDeliverablesViewProps {
  videoTasks: ClientVideoTask[];
  studioName?: string;
}

export function ClientVideoDeliverablesView({
  videoTasks = [],
  studioName = 'Pratima Studio',
}: ClientVideoDeliverablesViewProps) {
  if (videoTasks.length === 0) {
    return (
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Film className="h-6 w-6 stroke-1" />
          </div>
          <h3 className="text-base font-bold text-foreground">Video Deliverables in Editing</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Our cinematography editing team is currently cutting, color grading, and synchronizing your films.
            As soon as a draft teaser, reel, or feature cut is rendered, it will stream here for your private review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Section Header & Security Notice */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Film className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Cinematography & Video Reviews
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {videoTasks.length} {videoTasks.length === 1 ? 'Cut' : 'Cuts'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Review draft cuts, request revisions, and sign off on final cinematic films.
            </p>
          </div>

          <Badge
            variant="outline"
            className="self-start sm:self-center bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-medium gap-1.5 px-2.5 py-1"
          >
            <Lock className="h-3 w-3 text-amber-500" />
            <span>Anti-Download Protected Stream</span>
          </Badge>
        </div>

        {/* IP Security Notice Banner */}
        <div className="rounded-lg bg-muted/50 border border-border/60 p-3 text-[11px] text-muted-foreground flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground">Intellectual Property & Quality Protection:</strong> Video streaming
            is provided for review and creative feedback. To ensure master 4K bitrate fidelity and protect unfinalized drafts,
            direct file downloading is restricted until you approve the cut. High-resolution master downloads are unlocked
            immediately upon approval.
          </p>
        </div>
      </div>

      {/* Deliverable Cuts List */}
      <div className="space-y-6">
        {videoTasks.map((task) => {
          const cutTitle = task.taskType || task.type.replace(/_/g, ' ');

          return (
            <Card key={task.id} className="border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/20 pb-4 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold text-foreground">
                        {cutTitle}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                        {task.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {task.dueDate && (
                      <CardDescription className="text-xs flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-primary" />
                        <span>Target Due Date: {formatDate(task.dueDate, 'dd MMMM yyyy')}</span>
                      </CardDescription>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {task.revisionsCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        Revision #{task.revisionsCount}
                      </Badge>
                    )}

                    <Badge
                      className={
                        task.status === TaskStatus.APPROVED || task.status === TaskStatus.COMPLETED
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : task.status === TaskStatus.CHANGES_REQUESTED
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : task.status === TaskStatus.CLIENT_REVIEW
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }
                    >
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* 1. Secure Anti-Download Player */}
                {task.previewUrl ? (
                  <ClientVideoPlayer
                    url={task.previewUrl}
                    title={cutTitle}
                    studioName={studioName}
                    watermarkText={`${studioName.toUpperCase()} • CLIENT PREVIEW • DO NOT DISTRIBUTE`}
                  />
                ) : (
                  <div className="w-full aspect-video rounded-xl border border-dashed border-border/80 bg-muted/30 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <Film className="h-8 w-8 mb-2 stroke-1 text-muted-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">Draft cut in production</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Our editors are assembling this deliverable. The stream will appear here once ready.
                    </p>
                  </div>
                )}

                {/* 2. Interactive Approval & Revision Request Form */}
                {task.previewUrl && (
                  <ClientVideoFeedbackForm
                    taskId={task.id}
                    taskTitle={cutTitle}
                    currentStatus={task.status}
                    revisionsCount={task.revisionsCount}
                    existingFeedback={task.clientFeedback}
                    deliveryUrl={task.deliveryUrl}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
