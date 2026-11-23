'use client';

import * as React from 'react';
import { useState, useCallback, useTransition, useMemo } from 'react';
import {
  HardDrive,
  FolderInput,
  FolderCheck,
  Clock,
  Database,
  Calendar,
  UserCheck,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { getIngestionDeskDataAction } from '@/actions/data-ingestion.actions';
import { IngestionStatus } from '@prisma/client';

import { HandoverModal } from './handover-modal';
import { VerificationQueue } from './verification-queue';

export interface DataIngestionDeskProps {
  initialData?: {
    bookings: any[];
    jobs: any[];
    teamMembers: any[];
  };
  className?: string;
}

export function DataIngestionDesk({
  initialData,
  className,
}: DataIngestionDeskProps) {
  const [bookings, setBookings] = useState<any[]>(initialData?.bookings || []);
  const [jobs, setJobs] = useState<any[]>(initialData?.jobs || []);
  const [teamMembers, setTeamMembers] = useState<any[]>(initialData?.teamMembers || []);

  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [preselectedBookingId, setPreselectedBookingId] = useState<string | null>(null);

  const [isRefreshing, startTransition] = useTransition();

  const loadDeskData = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await getIngestionDeskDataAction();
        if (res.success && res.data) {
          setBookings(res.data.bookings || []);
          setJobs(res.data.jobs || []);
          setTeamMembers(res.data.teamMembers || []);
          toast.success('Ingestion desk refreshed');
        } else {
          toast.error(res.error || 'Failed to refresh data');
        }
      } catch (err: any) {
        toast.error('Unexpected error refreshing data');
      }
    });
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalJobs = jobs.length;
    const awaitingVerification = jobs.filter(
      (j) => j.status === IngestionStatus.PENDING || j.status === IngestionStatus.COPYING
    ).length;
    const verifiedJobs = jobs.filter((j) => j.status === IngestionStatus.VERIFIED).length;
    const totalVolumeGb = jobs.reduce((sum, j) => sum + (j.totalSizeGb || 0), 0);

    return {
      totalJobs,
      awaitingVerification,
      verifiedJobs,
      totalVolumeGb: Math.round(totalVolumeGb * 10) / 10,
    };
  }, [jobs]);

  // Shoots awaiting data handover (confirmed shoots with 0 logged ingestion jobs)
  const shootsAwaitingHandover = useMemo(() => {
    const jobBookingIdSet = new Set(jobs.map((j) => j.eventBookingId));
    return bookings.filter((b) => !jobBookingIdSet.has(b.id)).slice(0, 6);
  }, [bookings, jobs]);

  const handleOpenHandoverForBooking = (bookingId: string) => {
    setPreselectedBookingId(bookingId);
    setHandoverModalOpen(true);
  };

  return (
    <div className={cn('space-y-6 pb-20', className)}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Post-Shoot Data Ingestion & Payout Bridge
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                Operations Desk
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Physical card intake, checksum verification, and automated finance ledger liability authorization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDeskData}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setPreselectedBookingId(null);
              setHandoverModalOpen(true);
            }}
            className="h-8 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Media Handover</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-2xs border-border/70">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-medium">Awaiting Checksum / Dump</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.awaitingVerification}</div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Active memory card dumps & verifications
          </p>
        </Card>

        <Card className="p-4 shadow-2xs border-border/70">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-medium">Verified & Payout Eligible</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.verifiedJobs}</div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Accounts payable liability posted
          </p>
        </Card>

        <Card className="p-4 shadow-2xs border-border/70">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Volume Ingested</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.totalVolumeGb} <span className="text-sm font-normal text-muted-foreground">GB</span></div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Primary storage + cold mirrors
          </p>
        </Card>

        <Card className="p-4 shadow-2xs border-border/70">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Intake Jobs</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.totalJobs}</div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Lifetime tracked shoot media handovers
          </p>
        </Card>
      </div>

      {/* Shoots Awaiting Media Handover */}
      {shootsAwaitingHandover.length > 0 && (
        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Recent Shoots Awaiting Media Handover</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Shoots with confirmed crew that do not have raw memory cards logged into the studio yet.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shootsAwaitingHandover.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold bg-background">
                        {b.bookingNumber}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(b.startDate, 'dd MMM')}
                      </span>
                    </div>

                    <h4 className="font-bold text-foreground truncate">{b.title}</h4>
                    {b.customer && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Client: {b.customer.firstName} {b.customer.lastName}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenHandoverForBooking(b.id)}
                    className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/5 w-full justify-center"
                  >
                    <FolderInput className="w-3 h-3" />
                    <span>Log Handover</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Verification Queue */}
      <VerificationQueue
        jobs={jobs}
        onRefresh={loadDeskData}
      />

      {/* Media Handover Intake Modal */}
      <HandoverModal
        open={handoverModalOpen}
        onOpenChange={setHandoverModalOpen}
        bookings={bookings}
        teamMembers={teamMembers}
        preselectedBookingId={preselectedBookingId}
        onSuccess={loadDeskData}
      />
    </div>
  );
}
