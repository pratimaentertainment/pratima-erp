'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  Phone,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Briefcase,
  ShieldCheck,
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
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  assignCrewToSubEventAction,
  unassignCrewFromSubEventAction,
} from '@/actions/shoot-logistics.actions';

const ROLE_PRESETS = [
  'Lead Photographer',
  'Candid Photographer',
  'Traditional Photographer',
  'Cinematographer',
  'Traditional Videographer',
  'Drone Pilot',
  'Lighting Technician',
  'Production Assistant',
  'Sound Engineer',
  'Live Stream Specialist',
  'DIT / Lead Editor',
];

export interface CrewAllocationCardProps {
  booking: any;
  teamMembers: any[];
  onRefresh: () => void;
  className?: string;
}

export function CrewAllocationCard({
  booking,
  teamMembers = [],
  onRefresh,
  className,
}: CrewAllocationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetSubEventId, setTargetSubEventId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>(ROLE_PRESETS[0]);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [expectedGearList, setExpectedGearList] = useState<string>('');
  const [showByogField, setShowByogField] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const subEvents = booking?.subEvents || [];

  // Group team members into In-House staff vs Freelancers
  const inHouseMembers = useMemo(
    () => teamMembers.filter((m) => m.employmentType === 'IN_HOUSE' || !m.employmentType),
    [teamMembers]
  );

  const freelanceMembers = useMemo(
    () =>
      teamMembers.filter(
        (m) => m.employmentType === 'FREELANCE' || m.employmentType === 'FREELANCER'
      ),
    [teamMembers]
  );

  // Check currently selected user's employment type
  const selectedMember = useMemo(
    () => teamMembers.find((m) => m.id === selectedUserId),
    [teamMembers, selectedUserId]
  );

  const isSelectedFreelancer =
    selectedMember?.employmentType === 'FREELANCE' ||
    selectedMember?.employmentType === 'FREELANCER';

  const handleOpenAssign = (subEventId: string) => {
    setTargetSubEventId(subEventId);
    setSelectedUserId('');
    setSelectedRole(ROLE_PRESETS[0]);
    setPayoutAmount('');
    setNotes('');
    setExpectedGearList('');
    setShowByogField(false);
    setModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRole || !targetSubEventId) {
      toast.error('Please select both a team member and a designated role');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assignCrewToSubEventAction({
        bookingId: booking.id,
        subEventId: targetSubEventId,
        userId: selectedUserId,
        role: selectedRole,
        payoutAmount: payoutAmount ? Number(payoutAmount) : null,
        notes: notes || null,
        expectedGearList: expectedGearList.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to assign crew member');
        return;
      }

      toast.success(`Assigned ${selectedMember?.name || 'crew member'} to ${selectedRole}!`);
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error assigning crew');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    if (!confirm('Remove this crew member from the function roster?')) return;

    setIsDeleting(assignmentId);
    try {
      const res = await unassignCrewFromSubEventAction(assignmentId);
      if (!res.success) {
        toast.error(res.error || 'Failed to unassign crew');
        return;
      }
      toast.success('Crew member unassigned');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error unassigning crew');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card className={cn('border-border/80 shadow-xs flex flex-col h-full', className)}>
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Crew & Talent Allocation</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Assign in-house specialists and external freelancers per function with audit tracking.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 space-y-5">
        {subEvents.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl space-y-2 bg-muted/20">
            <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Sub-Events / Functions Configured</p>
            <p className="text-[11px] text-muted-foreground">
              Add sub-events (e.g. Sangeet, Wedding) to allocate role-based crew.
            </p>
          </div>
        ) : (
          subEvents.map((sub: any) => {
            const assignments = sub.staffAssignments || [];

            return (
              <div
                key={sub.id}
                className="rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-2xs"
              >
                {/* Sub-event Function Header */}
                <div className="p-3 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {sub.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(sub.eventDate, 'dd MMM yyyy')}
                      </span>
                      {sub.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sub.startTime} - {sub.endTime || 'End'}
                        </span>
                      )}
                      {sub.locationVenue && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="w-3 h-3" />
                          {sub.locationVenue}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAssign(sub.id)}
                    className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/5 text-primary self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign Crew</span>
                  </Button>
                </div>

                {/* Assigned Crew List */}
                <div className="p-3 divide-y divide-border/40">
                  {assignments.length === 0 ? (
                    <div className="py-3 text-center text-xs text-muted-foreground italic">
                      No crew assigned to {sub.name} yet. Click &quot;Assign Crew&quot; to schedule staff.
                    </div>
                  ) : (
                    assignments.map((asg: any) => {
                      const isFreelancer =
                        asg.user?.employmentType === 'FREELANCE' ||
                        asg.user?.employmentType === 'FREELANCER';

                      return (
                        <div
                          key={asg.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground truncate">
                                {asg.user?.name || 'Staff Member'}
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0 shrink-0 font-medium"
                              >
                                {asg.role}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] px-1.5 py-0 font-medium shrink-0',
                                  isFreelancer
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                                )}
                              >
                                {isFreelancer ? 'Freelancer' : 'In-House'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {asg.user?.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  {asg.user.phone}
                                </span>
                              )}
                              {asg.payoutAmount !== null && asg.payoutAmount !== undefined && (
                                <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                  <IndianRupee className="w-2.5 h-2.5" />
                                  {Number(asg.payoutAmount).toLocaleString('en-IN')} {isFreelancer ? 'Agreed Fee' : 'Payout'}
                                </span>
                              )}
                              {asg.notes && (
                                <span className="text-[10px] text-muted-foreground italic truncate max-w-xs">
                                  &quot;{asg.notes}&quot;
                                </span>
                              )}
                            </div>

                            {/* Contracted BYOG Gear List (if freelancer/specified) */}
                            {asg.expectedGearList && (
                              <div className="mt-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/25 text-xs">
                                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-700 dark:text-amber-400">
                                  <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Contracted BYOG Gear Checklist:</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono whitespace-pre-line pl-4 pt-0.5 leading-relaxed">
                                  {asg.expectedGearList}
                                </div>
                              </div>
                            )}

                            {/* Audit Trail: Who assigned whom and when */}
                            <div className="pt-0.5">
                              {asg.assignedBy?.name ? (
                                <span className="text-[10px] text-muted-foreground/80 italic flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-primary/70 shrink-0" />
                                  Assigned by <strong className="font-medium text-foreground/90">{asg.assignedBy.name}</strong> on {formatDateTime(asg.createdAt, 'dd MMM, hh:mm a')}
                                </span>
                              ) : asg.createdAt ? (
                                <span className="text-[10px] text-muted-foreground/70 italic flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  Allocated on {formatDateTime(asg.createdAt, 'dd MMM, hh:mm a')}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUnassign(asg.id)}
                            disabled={isDeleting === asg.id}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0 mt-0.5"
                            title="Remove from roster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Assign Crew Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Assign Crew Member</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select in-house staff or freelance contractor and set agreed compensation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
            {/* Team Member Select with Grouping */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Team Member / Freelancer *</Label>
              <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || '')}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inHouseMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                        In-House Team ({inHouseMembers.length})
                      </SelectLabel>
                      {inHouseMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{member.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {member.designation || 'In-House'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {freelanceMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase px-2 py-1 tracking-wider border-t border-border/40 mt-1 pt-1.5">
                        Freelancers & Contractors ({freelanceMembers.length})
                      </SelectLabel>
                      {freelanceMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{member.name}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Freelancer
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>

              {isSelectedFreelancer && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md mt-1">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span>Freelance contractor selected. Specify agreed per-function fee below.</span>
                </div>
              )}
            </div>

            {/* Role Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designated Role *</Label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val || ROLE_PRESETS[0])}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {ROLE_PRESETS.map((role) => (
                    <SelectItem key={role} value={role} className="text-xs">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payout Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Agreed Function Payout (₹ INR)</Label>
                {isSelectedFreelancer && (
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-300">
                    Freelancer Agreed Fee
                  </Badge>
                )}
              </div>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 5000"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Contracted Gear to Bring (BYOG) */}
            {(isSelectedFreelancer || showByogField) ? (
              <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/25">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    <span>Expected Gear to Bring (BYOG)</span>
                  </Label>
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
                    WhatsApp Checklist
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Items listed here will be sent directly in this freelancer&apos;s WhatsApp Call Sheet without registering in studio inventory.
                </p>
                <textarea
                  rows={3}
                  value={expectedGearList}
                  onChange={(e) => setExpectedGearList(e.target.value)}
                  placeholder="e.g. Sony A7IV Body&#10;Sony 24-70mm f/2.8 GM&#10;Godox V1 Flash + 2 spare batteries&#10;2x 128GB V90 SD cards"
                  className="w-full text-xs font-mono rounded-md border border-amber-500/30 bg-background px-3 py-2 text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowByogField(true)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-foreground py-0.5"
              >
                + Add Contracted BYOG Gear Checklist for this crew member
              </button>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assignment Instructions (Optional)</Label>
              <Input
                placeholder="e.g., Bring 50mm f/1.2 lens, report 30 mins prior"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !selectedUserId}
                className="text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Assigning...' : 'Confirm Assignment'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
