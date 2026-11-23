'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  ArrowRight,
  ShieldCheck,
  Search,
  IndianRupee,
  FolderCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDateTime, formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  verifyDataAndTriggerPayoutAction,
  updateIngestionStatusAction,
} from '@/actions/data-ingestion.actions';
import { IngestionStatus } from '@prisma/client';

export interface VerificationQueueProps {
  jobs: any[];
  onRefresh: () => void;
  className?: string;
}

export function VerificationQueue({
  jobs = [],
  onRefresh,
  className,
}: VerificationQueueProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VERIFIED' | 'ISSUES'>('ALL');

  // Verify Dialog State
  const [selectedJobToVerify, setSelectedJobToVerify] = useState<any | null>(null);
  const [verifiedSizeGb, setVerifiedSizeGb] = useState<string>('');
  const [backupPath, setBackupPath] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Issue Dialog State (Mark Corrupt/Missing)
  const [selectedJobForIssue, setSelectedJobForIssue] = useState<any | null>(null);
  const [issueStatus, setIssueStatus] = useState<IngestionStatus>(IngestionStatus.CORRUPT);
  const [issueNotes, setIssueNotes] = useState<string>('');
  const [isUpdatingIssue, setIsUpdatingIssue] = useState<boolean>(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const bookingNo = job.eventBooking?.bookingNumber?.toLowerCase() || '';
      const bookingTitle = job.eventBooking?.title?.toLowerCase() || '';
      const crewName = job.handedOverBy?.name?.toLowerCase() || '';
      const path = job.primaryStoragePath?.toLowerCase() || '';

      const matchesSearch =
        !q ||
        bookingNo.includes(q) ||
        bookingTitle.includes(q) ||
        crewName.includes(q) ||
        path.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'ACTIVE') {
        return (
          job.status === IngestionStatus.PENDING || job.status === IngestionStatus.COPYING
        );
      }
      if (statusFilter === 'VERIFIED') {
        return job.status === IngestionStatus.VERIFIED;
      }
      if (statusFilter === 'ISSUES') {
        return (
          job.status === IngestionStatus.CORRUPT || job.status === IngestionStatus.MISSING
        );
      }
      return true;
    });
  }, [jobs, searchQuery, statusFilter]);

  const handleOpenVerify = (job: any) => {
    setSelectedJobToVerify(job);
    setVerifiedSizeGb(job.totalSizeGb ? String(job.totalSizeGb) : '');
    setBackupPath(job.backupStoragePath || '');
    setVerificationNotes('Checksum verification passed (xxHash). Media ready for culling.');
  };

  const handleConfirmVerification = async () => {
    if (!selectedJobToVerify) return;

    setIsVerifying(true);
    try {
      const res = await verifyDataAndTriggerPayoutAction({
        jobId: selectedJobToVerify.id,
        verifiedSizeGb: verifiedSizeGb ? Number(verifiedSizeGb) : null,
        backupStoragePath: backupPath.trim() || null,
        verificationNotes: verificationNotes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to verify media');
        return;
      }

      toast.success(res.message || 'Media verified and payout approved!');
      setSelectedJobToVerify(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error verifying media');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmIssue = async () => {
    if (!selectedJobForIssue) return;

    setIsUpdatingIssue(true);
    try {
      const res = await updateIngestionStatusAction({
        jobId: selectedJobForIssue.id,
        status: issueStatus,
        notes: issueNotes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update job status');
        return;
      }

      toast.success(res.message || `Job flagged as ${issueStatus}`);
      setSelectedJobForIssue(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating status');
    } finally {
      setIsUpdatingIssue(false);
    }
  };

  const getStatusBadge = (status: IngestionStatus) => {
    switch (status) {
      case IngestionStatus.VERIFIED:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            VERIFIED
          </Badge>
        );
      case IngestionStatus.COPYING:
        return (
          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px] gap-1 font-semibold animate-pulse">
            <Clock className="w-3 h-3" />
            COPYING / DUMPING
          </Badge>
        );
      case IngestionStatus.PENDING:
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] gap-1 font-semibold">
            <Clock className="w-3 h-3" />
            PENDING DUMP
          </Badge>
        );
      case IngestionStatus.CORRUPT:
        return (
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px] gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3" />
            CORRUPT / DAMAGED
          </Badge>
        );
      case IngestionStatus.MISSING:
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1 font-semibold">
            <XCircle className="w-3 h-3" />
            MISSING FOOTAGE
          </Badge>
        );
    }
  };

  return (
    <Card className={cn('border-border/80 shadow-xs flex flex-col', className)}>
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <span>Ingestion & Checksum Verification Queue</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Review received media, verify checksums, and trigger automated freelancer payout liabilities.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, crew, or paths..."
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="pt-2 flex gap-1 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Jobs' },
            { id: 'ACTIVE', label: 'Active Ingestions (Copying / Pending)' },
            { id: 'VERIFIED', label: 'Verified & Payout Approved' },
            { id: 'ISSUES', label: 'Corrupt / Missing Flags' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors whitespace-nowrap',
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl space-y-2 bg-muted/10">
            <HardDrive className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Ingestion Jobs Found</p>
            <p className="text-[11px] text-muted-foreground">
              When raw memory cards or hard drives are handed over, log them above to populate this queue.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 border rounded-xl overflow-hidden">
            {filteredJobs.map((job) => {
              const isVerified = job.status === IngestionStatus.VERIFIED;
              const hasIssue =
                job.status === IngestionStatus.CORRUPT || job.status === IngestionStatus.MISSING;

              return (
                <div
                  key={job.id}
                  className={cn(
                    'p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors',
                    isVerified ? 'bg-card/30' : 'bg-card/70 hover:bg-muted/30'
                  )}
                >
                  {/* Left Column: Shoot, Crew, and Paths */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(job.status)}
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold">
                        {job.eventBooking?.bookingNumber || 'BK'}
                      </Badge>
                      <span className="font-bold text-foreground truncate">
                        {job.eventBooking?.title || 'Event Shoot'}
                      </span>
                      {job.subEvent && (
                        <span className="text-[10px] text-muted-foreground">
                          ({job.subEvent.name})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        Handed Over By: {job.handedOverBy?.name || 'External Crew'}
                        {job.handedOverBy?.employmentType && (
                          <span className="text-[10px] text-amber-600 font-normal">
                            ({job.handedOverBy.employmentType})
                          </span>
                        )}
                      </span>
                      {job.totalSizeGb && (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Database className="w-3 h-3 text-indigo-500" />
                          {job.totalSizeGb} GB
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        Logged {formatDateTime(job.createdAt, 'dd MMM, hh:mm a')}
                      </span>
                      {job.receivedBy && (
                        <span className="text-[10px] text-muted-foreground">
                          Desk: {job.receivedBy.name}
                        </span>
                      )}
                    </div>

                    {/* Storage Paths */}
                    <div className="pt-0.5 space-y-0.5 font-mono text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-primary font-semibold">PRIMARY:</span>
                        <span className="truncate">{job.primaryStoragePath || 'N/A'}</span>
                      </div>
                      {job.backupStoragePath && (
                        <div className="flex items-center gap-1.5 truncate text-indigo-600 dark:text-indigo-400">
                          <span className="font-semibold">MIRROR:</span>
                          <span className="truncate">{job.backupStoragePath}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {job.ingestionNotes && (
                      <p className="text-[10px] text-muted-foreground italic pt-0.5 line-clamp-2">
                        &quot;{job.ingestionNotes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    {!isVerified && !hasIssue && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleOpenVerify(job)}
                          className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <FolderCheck className="w-3.5 h-3.5" />
                          <span>Verify & Approve Payout</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJobForIssue(job);
                            setIssueStatus(IngestionStatus.CORRUPT);
                            setIssueNotes('');
                          }}
                          className="h-8 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Flag Issue</span>
                        </Button>
                      </>
                    )}

                    {isVerified && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verified & Transferred</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Verify & Trigger Payout Modal */}
      <Dialog
        open={Boolean(selectedJobToVerify)}
        onOpenChange={(open) => !open && setSelectedJobToVerify(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <FolderCheck className="w-4 h-4" />
              <span>Verify Media & Authorize Freelancer Payout</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm raw media checksums and mirror replication to authorize finance liability voucher creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
              <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Automatic Double-Entry Accounting Ledger Bridge</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Approving verification will mark{' '}
                <strong>{selectedJobToVerify?.handedOverBy?.name || 'the freelancer'}</strong> as{' '}
                <span className="text-emerald-600 font-semibold">ELIGIBLE_FOR_PAYMENT</span> and post a
                Journal Voucher in the Finance module debited to <em>Shooting Fees Expense</em> and
                credited to <em>Payouts Payable</em>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Verified Total Storage Size (GB)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={verifiedSizeGb}
                onChange={(e) => setVerifiedSizeGb(e.target.value)}
                placeholder="e.g. 240.5"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Secondary Mirror / Cold Storage Path</Label>
              <Input
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                placeholder="e.g. COLD-STORAGE-DRIVE-2/BACKUP/BK-2026-001"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Checksum Verification Notes</Label>
              <Input
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="e.g., All 4x SD cards verified via xxHash checksums."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedJobToVerify(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmVerification}
              disabled={isVerifying}
              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying & Posting Voucher...' : 'Approve & Post Liability'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Issue Modal */}
      <Dialog
        open={Boolean(selectedJobForIssue)}
        onOpenChange={(open) => !open && setSelectedJobForIssue(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Flag Media Handover Issue</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Suspend payout eligibility and alert production management of media corruption or missing cards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Issue Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={issueStatus === IngestionStatus.CORRUPT ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIssueStatus(IngestionStatus.CORRUPT)}
                  className="text-xs"
                >
                  Corrupt / Damaged Media
                </Button>
                <Button
                  type="button"
                  variant={issueStatus === IngestionStatus.MISSING ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setIssueStatus(IngestionStatus.MISSING)}
                  className="text-xs"
                >
                  Missing Footage / Cards
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Issue Details & Instructions</Label>
              <Input
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="e.g. Card 2 failed read test; request card re-scan from photographer."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedJobForIssue(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmIssue}
              disabled={isUpdatingIssue}
              className="text-xs font-bold gap-1.5"
            >
              <span>{isUpdatingIssue ? 'Updating...' : 'Confirm Issue Flag'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
