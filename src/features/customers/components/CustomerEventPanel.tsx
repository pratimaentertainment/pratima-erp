'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarCheck2,
  UserCheck,
  Check,
  Layers,
  Wallet,
  Banknote,
  BadgeDollarSign,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { StaffAssignmentStatus, EmploymentType } from '@prisma/client';
import {
  createSubEventAction,
  assignStaffToEventAction,
  deleteStaffAssignmentAction,
} from '@/actions/event.actions';
import { formatMoney } from '@/lib/currency';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface StaffAssignmentUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  skills?: string[];
  employmentType?: string | null;
}

export interface SubEventStaffAssignment {
  id: string;
  role?: string | null;
  status?: string | null;
  notes?: string | null;
  payoutAmount?: number | string | null;
  user?: StaffAssignmentUser | null;
}

export interface BookingSubEvent {
  id: string;
  name: string;
  eventDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  locationVenue?: string | null;
  venue?: string | null;
  notes?: string | null;
  staffAssignments?: SubEventStaffAssignment[];
}

export interface BookingEventItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: string;
  journeyStatus?: string;
  location?: string | null;
  venue?: string | null;
  subEvents?: BookingSubEvent[];
}

export interface CustomerEventPanelProps {
  customerId: string;
  customerName?: string;
  eventBookings?: BookingEventItem[];
  staffList?: StaffAssignmentUser[];
}

const COMMON_SUB_EVENTS = [
  'Haldi Ceremony',
  'Mehendi',
  'Sangeet Night',
  'Wedding / Muhurtham',
  'Reception',
  'Pre-Wedding Shoot',
  'Cocktail Party',
  'Ring Ceremony',
];

const COMMON_STAFF_ROLES = [
  { id: 'CANDID_PHOTO', label: 'Candid Photographer' },
  { id: 'CINEMATOGRAPHER', label: 'Cinematographer' },
  { id: 'TRADITIONAL_PHOTO', label: 'Traditional Photographer' },
  { id: 'TRADITIONAL_VIDEO', label: 'Traditional Videographer' },
  { id: 'DRONE_PILOT', label: 'Drone Pilot' },
  { id: 'ASSISTANT', label: 'Assistant / Grip' },
  { id: 'EDITOR', label: 'Same-Day Editor' },
  { id: 'DIRECTOR', label: 'Shoot Director' },
];

const QUICK_PAYOUT_AMOUNTS = [3000, 5000, 7500, 10000, 15000];

export function CustomerEventPanel({
  customerId,
  customerName,
  eventBookings = [],
  staffList = [],
}: CustomerEventPanelProps) {
  const router = useRouter();
  const [isSubmittingSubEvent, startSubEventTransition] = useTransition();
  const [isSubmittingStaff, startStaffTransition] = useTransition();
  const [isDeletingAssignment, startDeleteTransition] = useTransition();

  // Add Sub-Event Dialog State
  const [isAddSubEventOpen, setIsAddSubEventOpen] = useState(false);
  const [targetBookingId, setTargetBookingId] = useState<string | null>(null);
  const [subEventName, setSubEventName] = useState('');
  const [subEventDate, setSubEventDate] = useState('');
  const [subEventStartTime, setSubEventStartTime] = useState('10:00 AM');
  const [subEventEndTime, setSubEventEndTime] = useState('02:00 PM');
  const [subEventLocation, setSubEventLocation] = useState('');
  const [subEventNotes, setSubEventNotes] = useState('');
  const [subEventError, setSubEventError] = useState<string | null>(null);

  // Assign Staff Dialog State
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [targetSubEventId, setTargetSubEventId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRole, setSelectedRole] = useState('CANDID_PHOTO');
  const [customRole, setCustomRole] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState<StaffAssignmentStatus>(
    StaffAssignmentStatus.CONFIRMED
  );
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Computed summary metrics
  const summaryMetrics = useMemo(() => {
    let totalSubEvents = 0;
    let totalAssignments = 0;
    let inHouseCount = 0;
    let freelanceCount = 0;
    let totalFreelancerPayout = 0;

    eventBookings.forEach((b: BookingEventItem) => {
      const subs = b.subEvents || [];
      totalSubEvents += subs.length;
      subs.forEach((s: BookingSubEvent) => {
        const asgns = s.staffAssignments || [];
        totalAssignments += asgns.length;
        asgns.forEach((a: SubEventStaffAssignment) => {
          const isFreelance = a.user?.employmentType === 'FREELANCE';
          if (isFreelance) {
            freelanceCount++;
          } else {
            inHouseCount++;
          }
          if (a.payoutAmount) {
            totalFreelancerPayout += Number(a.payoutAmount) || 0;
          }
        });
      });
    });

    return {
      totalSubEvents,
      totalAssignments,
      inHouseCount,
      freelanceCount,
      totalFreelancerPayout,
    };
  }, [eventBookings]);

  // Selected staff user details in assign modal
  const activeSelectedStaff = useMemo(() => {
    return staffList.find((s: StaffAssignmentUser) => s.id === selectedStaffId);
  }, [staffList, selectedStaffId]);

  const isFreelancer = activeSelectedStaff?.employmentType === 'FREELANCE';

  // Open Add Sub-Event Modal
  const handleOpenAddSubEvent = (booking: BookingEventItem) => {
    setSubEventError(null);
    setTargetBookingId(booking.id);
    setSubEventName('');
    const defaultDate = booking.startDate
      ? new Date(booking.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setSubEventDate(defaultDate);
    setSubEventStartTime('10:00 AM');
    setSubEventEndTime('02:00 PM');
    setSubEventLocation(booking.location || '');
    setSubEventNotes('');
    setIsAddSubEventOpen(true);
  };

  // Submit Add Sub-Event
  const handleSubmitSubEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBookingId) return;

    if (!subEventName.trim()) {
      setSubEventError('Please enter a ceremony name.');
      return;
    }
    if (!subEventDate) {
      setSubEventError('Please select a date for the ceremony.');
      return;
    }

    setSubEventError(null);
    startSubEventTransition(async () => {
      try {
        const res = await createSubEventAction({
          eventBookingId: targetBookingId,
          name: subEventName.trim(),
          eventDate: subEventDate,
          startTime: subEventStartTime.trim() || '10:00 AM',
          endTime: subEventEndTime.trim() || '02:00 PM',
          locationVenue: subEventLocation.trim() || undefined,
          notes: subEventNotes.trim() || undefined,
        });

        if (res.success) {
          toast.success(`Sub-event "${subEventName}" scheduled successfully!`);
          setIsAddSubEventOpen(false);
          router.refresh();
        } else {
          setSubEventError(res.error || 'Failed to create sub-event');
          toast.error(res.error || 'Failed to create sub-event');
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'An unexpected error occurred';
        setSubEventError(msg);
        toast.error(msg);
      }
    });
  };

  // Open Assign Staff Modal
  const handleOpenAssignStaff = (subEventId: string) => {
    setAssignError(null);
    setTargetSubEventId(subEventId);
    const initialStaff = staffList[0];
    setSelectedStaffId(initialStaff?.id || '');
    setSelectedRole('CANDID_PHOTO');
    setCustomRole('');
    setAssignmentStatus(StaffAssignmentStatus.CONFIRMED);
    setPayoutAmount('');
    setAssignmentNotes('');
    setIsAssignStaffOpen(true);
  };

  // When staff selection changes, preset or clear payout
  const handleStaffChange = (staffId: string | null) => {
    const id = staffId || '';
    setSelectedStaffId(id);
    const staff = staffList.find((s: StaffAssignmentUser) => s.id === id);
    if (staff?.employmentType !== 'FREELANCE') {
      setPayoutAmount('');
    }
  };

  // Submit Assign Staff
  const handleSubmitAssignStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubEventId) return;

    if (!selectedStaffId) {
      setAssignError('Please select a staff member.');
      return;
    }

    const effectiveRole =
      selectedRole === 'CUSTOM' ? customRole.trim() : selectedRole;
    if (!effectiveRole) {
      setAssignError('Please specify the assignment role.');
      return;
    }

    setAssignError(null);
    startStaffTransition(async () => {
      try {
        const res = await assignStaffToEventAction({
          subEventId: targetSubEventId,
          userId: selectedStaffId,
          role: effectiveRole,
          status: assignmentStatus,
          payoutAmount: payoutAmount ? Number(payoutAmount) : null,
          notes: assignmentNotes.trim() || undefined,
        });

        if (res.success) {
          toast.success('Staff member assigned to event roster!');
          setIsAssignStaffOpen(false);
          router.refresh();
        } else {
          setAssignError(res.error || 'Failed to assign staff');
          toast.error(res.error || 'Failed to assign staff');
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'An unexpected error occurred';
        setAssignError(msg);
        toast.error(msg);
      }
    });
  };

  // Delete staff assignment
  const handleDeleteAssignment = (assignmentId: string) => {
    startDeleteTransition(async () => {
      try {
        const res = await deleteStaffAssignmentAction(assignmentId);
        if (res.success) {
          toast.success('Staff assignment removed.');
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to remove assignment');
        }
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to remove assignment');
      }
    });
  };

  // Booking status badge
  const renderBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Confirmed Booking
          </Badge>
        );
      case 'BLOCKED':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Dates Blocked
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Staff status badge
  const renderStaffStatusBadge = (status?: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> Confirmed
          </span>
        );
      case 'PENDING':
        return (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> Pending
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {status}
          </span>
        );
    }
  };

  // Employment type badge
  const renderEmploymentTypeBadge = (type?: string | null) => {
    if (type === 'FREELANCE') {
      return (
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
          Freelance
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded">
        In-House
      </span>
    );
  };

  // Role display label
  const formatRoleLabel = (role?: string | null) => {
    if (!role) return 'Crew Member';
    const found = COMMON_STAFF_ROLES.find((r) => r.id === role);
    return found ? found.label : role.replace(/_/g, ' ');
  };

  // EMPTY STATE: No Event Bookings
  if (eventBookings.length === 0) {
    return (
      <Card className="border-dashed shadow-xs">
        <CardContent className="py-14 px-6 text-center space-y-4 max-w-lg mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <CalendarCheck2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              No Confirmed Event Bookings
            </h3>
            <p className="text-xs text-muted-foreground">
              Events and ceremony itineraries are scheduled once a quotation is approved
              and dates are locked.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Event Bookings</p>
              <h4 className="text-xl font-bold tracking-tight">
                {eventBookings.length}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sub-Events Scheduled</p>
              <h4 className="text-xl font-bold tracking-tight">
                {summaryMetrics.totalSubEvents}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Crew Deployed</p>
              <h4 className="text-xl font-bold tracking-tight">
                {summaryMetrics.totalAssignments}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  ({summaryMetrics.inHouseCount} In-House • {summaryMetrics.freelanceCount} Freelance)
                </span>
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Freelancer Payouts</p>
              <h4 className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
                {formatMoney(summaryMetrics.totalFreelancerPayout)}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List of Event Bookings & Timeline */}
      <div className="space-y-6">
        {eventBookings.map((booking: BookingEventItem) => {
          const subEvents = booking.subEvents || [];
          const bookingFreelancerCost = subEvents.reduce((acc: number, sub: BookingSubEvent) => {
            const subSum = (sub.staffAssignments || []).reduce(
              (sAcc: number, a: SubEventStaffAssignment) => sAcc + (Number(a.payoutAmount) || 0),
              0
            );
            return acc + subSum;
          }, 0);

          return (
            <Card key={booking.id} className="shadow-xs overflow-hidden border">
              {/* Event Booking Header */}
              <CardHeader className="bg-muted/30 border-b p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-foreground">
                        {booking.title || 'Event Booking'}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        ({booking.bookingNumber})
                      </span>
                      {renderBookingStatusBadge(booking.status)}

                      {bookingFreelancerCost > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-mono text-xs"
                        >
                          <Banknote className="w-3 h-3 mr-1" />
                          Roster Payout: {formatMoney(bookingFreelancerCost)}
                        </Badge>
                      )}
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Dates:{' '}
                        <strong className="text-foreground font-medium">
                          {booking.startDate
                            ? format(new Date(booking.startDate), 'PP')
                            : 'N/A'}{' '}
                          -{' '}
                          {booking.endDate
                            ? format(new Date(booking.endDate), 'PP')
                            : 'N/A'}
                        </strong>
                      </span>
                      {booking.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {booking.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenAddSubEvent(booking)}
                    className="gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Sub-Event
                  </Button>
                </div>
              </CardHeader>

              {/* Sub-Events & Crew Roster Itinerary */}
              <CardContent className="p-5 space-y-4">
                {subEvents.length === 0 ? (
                  <div className="py-8 text-center space-y-2 border border-dashed rounded-lg bg-muted/20">
                    <Calendar className="w-7 h-7 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-semibold text-foreground">
                      No Sub-Events Scheduled Yet
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Break down this event booking into ceremonies (e.g. Haldi, Sangeet,
                      Wedding) to deploy equipment, in-house crew, and freelance artists.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAddSubEvent(booking)}
                      className="gap-1 text-xs mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Ceremony
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subEvents.map((sub: BookingSubEvent, idx: number) => {
                      const assignments = sub.staffAssignments || [];
                      const subEventPayout = assignments.reduce(
                        (acc: number, a: SubEventStaffAssignment) => acc + (Number(a.payoutAmount) || 0),
                        0
                      );

                      return (
                        <div
                          key={sub.id}
                          className="rounded-xl border p-4 bg-card hover:border-primary/40 transition-colors space-y-3"
                        >
                          {/* Sub-Event Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                                  {idx + 1}
                                </span>
                                <h4 className="font-semibold text-sm text-foreground">
                                  {sub.name}
                                </h4>
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {sub.startTime} - {sub.endTime}
                                </Badge>

                                {subEventPayout > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-mono"
                                  >
                                    Crew Cost: {formatMoney(subEventPayout)}
                                  </Badge>
                                )}
                              </div>
                              <div
                                className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5"
                                suppressHydrationWarning
                              >
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {sub.eventDate
                                    ? format(new Date(sub.eventDate), 'dd MMM yyyy')
                                    : 'Date Pending'}
                                </span>
                                {sub.locationVenue && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {sub.locationVenue}
                                  </span>
                                )}
                                {sub.notes && (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    &ldquo;{sub.notes}&rdquo;
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssignStaff(sub.id)}
                              className="gap-1.5 text-xs shrink-0"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-primary" />
                              Assign Team Member
                            </Button>
                          </div>

                          {/* Crew Roster Grid */}
                          <div className="pt-2 border-t mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
                              <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-foreground">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                Assigned Crew ({assignments.length})
                              </span>
                            </div>

                            {assignments.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-dashed text-center">
                                No crew members assigned yet. Click &quot;Assign Team Member&quot; to
                                deploy staff and freelancers to this ceremony.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {assignments.map((asgn: SubEventStaffAssignment) => {
                                  const staffUser = asgn.user;
                                  const empType = staffUser?.employmentType;
                                  const hasPayout =
                                    asgn.payoutAmount !== null &&
                                    asgn.payoutAmount !== undefined;

                                  return (
                                    <div
                                      key={asgn.id}
                                      className="p-3 rounded-lg border bg-muted/30 text-xs flex flex-col justify-between gap-2 group hover:border-primary/30 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-foreground truncate">
                                              {staffUser?.name || 'Unknown Member'}
                                            </span>
                                            {renderEmploymentTypeBadge(empType)}
                                          </div>
                                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium text-primary">
                                              {formatRoleLabel(asgn.role)}
                                            </span>
                                            <span>•</span>
                                            {renderStaffStatusBadge(asgn.status)}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAssignment(asgn.id)}
                                          disabled={isDeletingAssignment}
                                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer shrink-0"
                                          title="Remove from roster"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Payout & Notes Footer */}
                                      {(hasPayout || asgn.notes) && (
                                        <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                          {hasPayout ? (
                                            <span className="font-mono font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                              <BadgeDollarSign className="w-3.5 h-3.5" />
                                              Payout: {formatMoney(Number(asgn.payoutAmount))}
                                            </span>
                                          ) : (
                                            <span />
                                          )}
                                          {asgn.notes && (
                                            <span className="text-muted-foreground italic truncate max-w-[150px]" title={asgn.notes}>
                                              {asgn.notes}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Sub-Event Dialog */}
      <Dialog open={isAddSubEventOpen} onOpenChange={setIsAddSubEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Add Ceremony / Sub-Event
            </DialogTitle>
            <DialogDescription>
              Schedule an event milestone (Haldi, Sangeet, Muhurtham, etc.) for this booking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSubEvent} className="space-y-4 pt-1">
            {subEventError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subEventError}</span>
              </div>
            )}

            {/* Quick ceremony selection pills */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ceremony Presets</Label>
              <div className="flex flex-wrap gap-1">
                {COMMON_SUB_EVENTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSubEventName(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="subEventName">Ceremony Name *</Label>
              <Input
                id="subEventName"
                placeholder="e.g., Haldi & Mehendi"
                value={subEventName}
                onChange={(e) => setSubEventName(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="subEventDate">Event Date *</Label>
              <Input
                id="subEventDate"
                type="date"
                value={subEventDate}
                onChange={(e) => setSubEventDate(e.target.value)}
                required
              />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="subStartTime">Start Time *</Label>
                <Input
                  id="subStartTime"
                  placeholder="10:00 AM"
                  value={subEventStartTime}
                  onChange={(e) => setSubEventStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subEndTime">End Time *</Label>
                <Input
                  id="subEndTime"
                  placeholder="02:00 PM"
                  value={subEventEndTime}
                  onChange={(e) => setSubEventEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Venue Location */}
            <div className="space-y-2">
              <Label htmlFor="subLocation">Venue / Location</Label>
              <Input
                id="subLocation"
                placeholder="e.g., Grand Hyatt Ballroom"
                value={subEventLocation}
                onChange={(e) => setSubEventLocation(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="subNotes">Production Notes</Label>
              <Input
                id="subNotes"
                placeholder="e.g., Traditional dress code, 2 drone batteries required"
                value={subEventNotes}
                onChange={(e) => setSubEventNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSubEventOpen(false)}
                disabled={isSubmittingSubEvent}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSubEvent} className="gap-1.5">
                {isSubmittingSubEvent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Save Sub-Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignStaffOpen} onOpenChange={setIsAssignStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Assign Crew Member
            </DialogTitle>
            <DialogDescription>
              Deploy an in-house technician or freelance specialist to this ceremony.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAssignStaff} className="space-y-4 pt-1">
            {assignError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Select Staff */}
            <div className="space-y-2">
              <Label htmlFor="assignStaff">Team Member *</Label>
              <Select value={selectedStaffId} onValueChange={handleStaffChange}>
                <SelectTrigger id="assignStaff" className="w-full">
                  <SelectValue placeholder="Select a crew member">
                    {(val: string | null) => {
                      if (!val) return 'Select a crew member';
                      const staff = staffList.find((s: StaffAssignmentUser) => s.id === val);
                      return staff ? staff.name : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff: StaffAssignmentUser) => (
                    <SelectItem
                      key={staff.id}
                      value={staff.id}
                    >
                      <div className="flex items-center justify-between w-full gap-2 text-xs">
                        <span>
                          {staff.name}{' '}
                          {staff.designation ? `(${staff.designation})` : ''}
                        </span>
                        {staff.employmentType === 'FREELANCE' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 px-1 py-0.2 rounded">
                            Freelancer
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 px-1 py-0.2 rounded">
                            In-House
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notice Callout for Freelancer vs In-House */}
            {activeSelectedStaff && (
              <div
                className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
                  isFreelancer
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                    : 'bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
                }`}
              >
                {isFreelancer ? (
                  <BadgeDollarSign className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Briefcase className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {isFreelancer ? 'Freelancer Selected' : 'In-House Staff Selected'}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isFreelancer
                      ? 'Please specify the agreed payout amount below to track production expenses.'
                      : 'Compensated via standard monthly payroll. Payout is optional for special allowances.'}
                  </p>
                </div>
              </div>
            )}

            {/* Agreed Payout Amount (Specifically Enabled for Freelancers) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payoutAmount" className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-primary" />
                  Agreed Payout Amount (₹)
                  {isFreelancer && <span className="text-amber-600">*</span>}
                </Label>
                {isFreelancer && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Freelancer Rate
                  </span>
                )}
              </div>
              <Input
                id="payoutAmount"
                type="number"
                min="0"
                step="100"
                placeholder={isFreelancer ? 'e.g., 5000' : '0 (Optional for In-House)'}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />

              {/* Quick payout amount pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Presets:</span>
                {QUICK_PAYOUT_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPayoutAmount(amt.toString())}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-900 dark:hover:text-amber-300 border transition-colors cursor-pointer"
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assignment Role *</Label>
              <div className="flex flex-wrap gap-1">
                {COMMON_STAFF_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setCustomRole('');
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      selectedRole === role.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted hover:bg-primary/10'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedRole('CUSTOM')}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedRole === 'CUSTOM'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted hover:bg-primary/10'
                  }`}
                >
                  Custom Role...
                </button>
              </div>

              {selectedRole === 'CUSTOM' && (
                <div className="pt-2">
                  <Input
                    placeholder="Enter custom role title"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* Assignment Status */}
            <div className="space-y-2">
              <Label htmlFor="assignStatus">Assignment Status</Label>
              <Select
                value={assignmentStatus}
                onValueChange={(v) => setAssignmentStatus(v as StaffAssignmentStatus)}
              >
                <SelectTrigger id="assignStatus" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StaffAssignmentStatus.CONFIRMED}>
                    Confirmed (Ready to Deploy)
                  </SelectItem>
                  <SelectItem value={StaffAssignmentStatus.PENDING}>
                    Pending (Awaiting Confirmation)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Notes / Equipment */}
            <div className="space-y-2">
              <Label htmlFor="assignNotes">Assigned Gear / Special Notes</Label>
              <Input
                id="assignNotes"
                placeholder="e.g., Sony A7 IV + 24-70mm GM II, Drone Mavic 3"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignStaffOpen(false)}
                disabled={isSubmittingStaff}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingStaff} className="gap-1.5">
                {isSubmittingStaff ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Roster Deployment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Alias export for backward compatibility
export const CustomerEventsRosterPanel = CustomerEventPanel;
