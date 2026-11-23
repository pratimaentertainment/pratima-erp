'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  HardDrive,
  FolderInput,
  CheckCircle2,
  Calendar,
  User,
  Layers,
  Database,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { logDataHandoverAction } from '@/actions/data-ingestion.actions';
import { formatDate } from '@/lib/date';

export interface HandoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: any[];
  teamMembers: any[];
  preselectedBookingId?: string | null;
  onSuccess: () => void;
}

export function HandoverModal({
  open,
  onOpenChange,
  bookings = [],
  teamMembers = [],
  preselectedBookingId = null,
  onSuccess,
}: HandoverModalProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    preselectedBookingId || (bookings.length > 0 ? bookings[0].id : '')
  );
  const [selectedSubEventId, setSelectedSubEventId] = useState<string>('all');
  const [handedOverById, setHandedOverById] = useState<string>('');
  const [primaryPath, setPrimaryPath] = useState<string>('');
  const [backupPath, setBackupPath] = useState<string>('');
  const [totalSizeGb, setTotalSizeGb] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync selectedBookingId if preselectedBookingId changes
  React.useEffect(() => {
    if (preselectedBookingId) {
      setSelectedBookingId(preselectedBookingId);
    } else if (bookings.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [preselectedBookingId, bookings, selectedBookingId]);

  // Find active booking
  const currentBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId),
    [bookings, selectedBookingId]
  );

  const subEvents = currentBooking?.subEvents || [];

  // Suggest default primary path based on booking title & booking number
  React.useEffect(() => {
    if (currentBooking) {
      const sanitizedTitle = (currentBooking.title || 'SHOOT')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .toUpperCase();
      const code = currentBooking.bookingNumber || 'BK';
      const year = new Date().getFullYear();
      if (!primaryPath || primaryPath.startsWith('NAS-01/')) {
        setPrimaryPath(`NAS-01/${year}/${code}_${sanitizedTitle}/RAW`);
      }
    }
  }, [currentBooking]);

  // Extract crew members assigned to this specific booking / sub-event
  const assignedCrewForBooking = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; type: string }>();

    (currentBooking?.assignments || []).forEach((asg: any) => {
      if (asg.user) {
        map.set(asg.user.id, {
          id: asg.user.id,
          name: asg.user.name,
          role: asg.role,
          type: asg.user.employmentType || 'STAFF',
        });
      }
    });

    (currentBooking?.subEvents || []).forEach((s: any) => {
      (s.staffAssignments || []).forEach((sa: any) => {
        if (sa.user) {
          map.set(sa.user.id, {
            id: sa.user.id,
            name: sa.user.name,
            role: sa.role,
            type: sa.user.employmentType || 'STAFF',
          });
        }
      });
    });

    return Array.from(map.values());
  }, [currentBooking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) {
      toast.error('Please select an event booking');
      return;
    }
    if (!handedOverById) {
      toast.error('Please select who handed over the raw media/cards');
      return;
    }
    if (!primaryPath.trim()) {
      toast.error('Please provide the primary NAS / storage folder path');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await logDataHandoverAction({
        eventBookingId: selectedBookingId,
        subEventId: selectedSubEventId === 'all' ? null : selectedSubEventId,
        handedOverById,
        primaryStoragePath: primaryPath.trim(),
        backupStoragePath: backupPath.trim() || null,
        totalSizeGb: totalSizeGb ? Number(totalSizeGb) : null,
        ingestionNotes: notes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to log media handover');
        return;
      }

      toast.success(res.message || 'Media handover recorded successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Error recording media handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <span>Log Raw Media Handover & Ingestion</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Record physical memory cards or external hard drives received from shoot crew and freelancers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Target Shoot Booking */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Event Shoot *</Label>
            <Select
              value={selectedBookingId}
              onValueChange={(val) => {
                setSelectedBookingId(val || '');
                setSelectedSubEventId('all');
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose shoot..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    <span className="font-semibold">{b.bookingNumber}</span> — {b.title} (
                    {formatDate(b.startDate, 'dd MMM yyyy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-Event Function (Optional) */}
          {subEvents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Sub-Event / Function</Label>
              <Select
                value={selectedSubEventId}
                onValueChange={(val) => setSelectedSubEventId(val || 'all')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Entire Event (All Functions)" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  <SelectItem value="all" className="text-xs">
                    Entire Event (All Functions Combined)
                  </SelectItem>
                  {subEvents.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({formatDate(s.eventDate, 'dd MMM yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Who handed over the media */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Handed Over By (Crew / Freelancer) *</Label>
              <span className="text-[10px] text-muted-foreground">Authorizes Payout Upon Verification</span>
            </div>
            <Select
              value={handedOverById}
              onValueChange={(val) => setHandedOverById(val || '')}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select crew member..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {assignedCrewForBooking.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-primary tracking-wider px-2 py-1">
                      Assigned Shoot Crew ({assignedCrewForBooking.length})
                    </SelectLabel>
                    {assignedCrewForBooking.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{c.name} ({c.role})</span>
                          <span className="text-[10px] text-amber-600 font-medium">{c.type}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1 border-t mt-1 pt-1">
                    All Studio Team & Freelancers
                  </SelectLabel>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name} ({m.designation || m.employmentType || 'Staff'})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Storage & Backup Paths */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FolderInput className="w-3.5 h-3.5 text-primary" />
                <span>Primary NAS / Local Path *</span>
              </Label>
              <Input
                value={primaryPath}
                onChange={(e) => setPrimaryPath(e.target.value)}
                placeholder="e.g., NAS-01/2026/BK-2026-001/RAW"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Backup / Mirror Path (Optional)</span>
                </Label>
                <Input
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="e.g., COLD-STORAGE-DRIVE-2/BACKUP"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Estimated Volume (GB)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={totalSizeGb}
                  onChange={(e) => setTotalSizeGb(e.target.value)}
                  placeholder="e.g., 185.5"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Ingestion Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Card Numbers / Physical Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Received 3x SanDisk 128GB SD Cards (CAM-A, Drone micro-SD)"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !handedOverById || !primaryPath.trim()}
              className="text-xs font-bold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Logging...' : 'Record Media Handover'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
