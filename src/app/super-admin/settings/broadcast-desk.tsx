'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Megaphone,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  PowerOff,
  Clock,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  createPlatformBroadcastAction,
  deactivatePlatformBroadcastAction,
  type CreateBroadcastInput,
} from '@/actions/super-admin-governance.actions';

export interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface BroadcastDeskProps {
  initialBroadcasts: BroadcastItem[];
}

export function BroadcastDesk({ initialBroadcasts }: BroadcastDeskProps) {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(initialBroadcasts);
  const [openCreate, setOpenCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBroadcastInput>({
    defaultValues: {
      title: '',
      message: '',
      severity: 'INFO',
      expiresAt: '',
      isActive: true,
    },
  });

  const selectedSeverity = watch('severity');
  const watchedTitle = watch('title');
  const watchedMessage = watch('message');

  const onSubmit = (data: CreateBroadcastInput) => {
    startTransition(async () => {
      try {
        const res = await createPlatformBroadcastAction({
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        });

        if (res.success) {
          toast.success(res.message);
          setOpenCreate(false);
          reset();
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to create broadcast.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const handleDeactivate = (broadcastId: string) => {
    if (!window.confirm('Are you sure you want to immediately deactivate this platform broadcast?')) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deactivatePlatformBroadcastAction(broadcastId);
        if (res.success) {
          toast.success(res.message);
          setBroadcasts((prev) =>
            prev.map((b) => (b.id === broadcastId ? { ...b, isActive: false } : b))
          );
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to deactivate broadcast.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error deactivating broadcast.');
      }
    });
  };

  const activeBroadcasts = broadcasts.filter((b) => {
    if (!b.isActive) return false;
    if (b.expiresAt && new Date(b.expiresAt) < new Date()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <span>Platform Announcement Desk</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Broadcast emergency banners, scheduled maintenance notices, and platform updates across all studio dashboards.
          </p>
        </div>

        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger
            render={
              <Button size="sm" className="h-9 text-xs font-semibold gap-1.5 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>New Announcement</span>
              </Button>
            }
          />

          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Broadcast System Announcement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Announcements appear as top banners in all studio owner and staff workspaces.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              {/* Severity Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Announcement Severity</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('severity', 'INFO')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedSeverity === 'INFO'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-border/70 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                    <span>Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('severity', 'WARNING')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedSeverity === 'WARNING'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20'
                        : 'border-border/70 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Warning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('severity', 'CRITICAL')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedSeverity === 'CRITICAL'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-border/70 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
                    <span>Critical</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Announcement Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                  className="text-xs h-9"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && (
                  <p className="text-[11px] text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold">
                  Message Content *
                </Label>
                <Textarea
                  id="message"
                  rows={3}
                  placeholder="Detail the timeline, impacted modules (e.g. Album processing), or instructions for studios..."
                  className="text-xs"
                  {...register('message', { required: 'Message is required' })}
                />
                {errors.message && (
                  <p className="text-[11px] text-destructive">{errors.message.message}</p>
                )}
              </div>

              {/* Expiration Date/Time */}
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt" className="text-xs font-semibold">
                  Optional Auto-Expiration (Local Time)
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  className="text-xs h-9"
                  {...register('expiresAt')}
                />
                <p className="text-[10px] text-muted-foreground">
                  Leave blank if the broadcast should remain active indefinitely until manually archived.
                </p>
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Live Dashboard Preview
                </Label>
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    selectedSeverity === 'CRITICAL'
                      ? 'bg-rose-600 text-white border-rose-700'
                      : selectedSeverity === 'WARNING'
                      ? 'bg-amber-500 text-amber-950 border-amber-600'
                      : 'bg-blue-600 text-white border-blue-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold tracking-tight">
                        {watchedTitle || 'Announcement Title Preview'}
                      </span>
                      <span className="opacity-60">•</span>
                      <span className="opacity-95 text-[11px]">
                        {watchedMessage || 'Announcement message preview will appear here...'}
                      </span>
                    </div>
                    <div className="p-0.5 rounded opacity-60">
                      <X className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setOpenCreate(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs h-9 gap-1.5 font-semibold"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Publish Announcement</span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Broadcast Feed */}
      <div className="space-y-3">
        {broadcasts.length === 0 ? (
          <Card className="border-dashed border-2 border-border/70 p-8 text-center bg-muted/20">
            <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No broadcasts created</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Announcements broadcast platform maintenance schedules or urgent notices directly to studios.
            </p>
          </Card>
        ) : (
          broadcasts.map((b) => {
            const isExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
            const isCurrentlyActive = b.isActive && !isExpired;

            return (
              <Card
                key={b.id}
                className={`border transition-all shadow-2xs ${
                  isCurrentlyActive
                    ? b.severity === 'CRITICAL'
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : b.severity === 'WARNING'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-blue-500/40 bg-blue-500/5'
                    : 'border-border/60 bg-card/60 opacity-70'
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          b.severity === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            : b.severity === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                        }`}
                      >
                        {b.severity}
                      </Badge>

                      <span className="font-bold text-sm text-foreground">{b.title}</span>

                      {isCurrentlyActive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold"
                        >
                          Live Broadcast
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Deactivated
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {b.message}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        Posted:{' '}
                        {new Date(b.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {b.expiresAt && (
                        <span
                          className={`flex items-center gap-1 font-mono ${
                            isExpired ? 'text-rose-500 font-semibold' : ''
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Expires:{' '}
                          {new Date(b.expiresAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}

                      {b.createdBy?.email && (
                        <span>By: {b.createdBy.email}</span>
                      )}
                    </div>
                  </div>

                  {isCurrentlyActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(b.id)}
                      disabled={isPending}
                      className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0 gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PowerOff className="h-3.5 w-3.5" />
                      )}
                      <span>Deactivate</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
