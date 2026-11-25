'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Camera,
  Film,
  Boxes,
  Plus,
  Trash2,
  Printer,
  Copy,
  Share2,
  MessageCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  BadgeAlert,
  Loader2,
  Receipt,
  Phone,
  Mail,
  Send,
  Car,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  assignCrewToSubEvent,
  removeCrewFromSubEvent,
  assignGearToSubEvent,
  removeGearFromSubEvent,
} from '@/actions/dispatch.actions';
import {
  assignVehicleToSubEventAction,
  removeVehicleFromSubEventAction,
} from '@/actions/vehicle.actions';
import { createSubEventAction } from '@/actions/event.actions';
import { BookingVoucherDocument, type BookingVoucherData } from '@/features/bookings/components/BookingVoucherDocument';
import { JourneyTracker } from '@/components/portal/journey-tracker';

export interface AvailableCrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  employmentType: string | null;
}

export interface AvailableEquipmentItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
}

export interface AvailableVehicleItem {
  id: string;
  plateNumber: string;
  makeModel: string;
  type?: string | null;
  capacity?: number | null;
  driverName?: string | null;
  driverPhone?: string | null;
  status: string;
  branch?: { id: string; name: string; code?: string | null } | null;
}

export interface BookingCommandCenterClientProps {
  initialData: {
    booking: any;
    availableCrew: AvailableCrewMember[];
    availableGear: AvailableEquipmentItem[];
    availableVehicles?: AvailableVehicleItem[];
  };
}

const CREW_ROLES = [
  { value: 'LEAD_PHOTOGRAPHER', label: 'Lead Photographer' },
  { value: 'CANDID_PHOTOGRAPHER', label: 'Candid Photographer' },
  { value: 'TRADITIONAL_PHOTOGRAPHER', label: 'Traditional Photographer' },
  { value: 'CINEMATOGRAPHER', label: 'Cinematographer (DOP)' },
  { value: 'DRONE_PILOT', label: 'Drone Pilot' },
  { value: 'ASSISTANT', label: 'Lighting / Production Assistant' },
  { value: 'CREW_LEAD', label: 'On-Site Crew Director' },
];

export function BookingCommandCenterClient({ initialData }: BookingCommandCenterClientProps) {
  const router = useRouter();
  const { booking, availableCrew, availableGear, availableVehicles = [] } = initialData;

  const subEvents = booking.subEvents || [];
  const defaultTab = subEvents.length > 0 ? subEvents[0].id : 'voucher';
  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);

  // Crew Assignment Form State per subEvent
  const [selectedCrewId, setSelectedCrewId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<string>('LEAD_PHOTOGRAPHER');
  const [payoutAmount, setPayoutAmount] = React.useState<string>('');
  const [crewNotes, setCrewNotes] = React.useState<string>('');
  const [isAssigningCrew, setIsAssigningCrew] = React.useState<boolean>(false);
  const [deletingCrewId, setDeletingCrewId] = React.useState<string | null>(null);

  // Gear Allocation Form State per subEvent
  const [selectedGearId, setSelectedGearId] = React.useState<string>('');
  const [gearNotes, setGearNotes] = React.useState<string>('');
  const [isAllocatingGear, setIsAllocatingGear] = React.useState<boolean>(false);
  const [deletingGearId, setDeletingGearId] = React.useState<string | null>(null);

  // Vehicle Allocation Form State per subEvent
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>('');
  const [vehicleDriverName, setVehicleDriverName] = React.useState<string>('');
  const [vehicleDriverPhone, setVehicleDriverPhone] = React.useState<string>('');
  const [vehicleNotes, setVehicleNotes] = React.useState<string>('');
  const [isAllocatingVehicle, setIsAllocatingVehicle] = React.useState<boolean>(false);
  const [deletingVehicleBookingId, setDeletingVehicleBookingId] = React.useState<string | null>(null);

  // New SubEvent Creation State
  const [showAddSubEvent, setShowAddSubEvent] = React.useState(false);
  const [newSubEventName, setNewSubEventName] = React.useState('');
  const [newSubEventDate, setNewSubEventDate] = React.useState(
    booking.startDate ? new Date(booking.startDate).toISOString().slice(0, 10) : ''
  );
  const [newSubEventStartTime, setNewSubEventStartTime] = React.useState('10:00');
  const [newSubEventEndTime, setNewSubEventEndTime] = React.useState('14:00');
  const [newSubEventVenue, setNewSubEventVenue] = React.useState(booking.location || '');
  const [isCreatingSubEvent, setIsCreatingSubEvent] = React.useState(false);

  const customer = booking.customer || {};
  const customerName =
    customer.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    'Client';

  const dateStr = React.useMemo(() => {
    const s = formatDate(booking.startDate, 'dd MMM yyyy');
    const e = booking.endDate ? formatDate(booking.endDate, 'dd MMM yyyy') : null;
    return e && e !== s ? `${s} to ${e}` : s;
  }, [booking.startDate, booking.endDate]);

  // Construct URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const voucherUrl = `${baseUrl}/voucher/${booking.id}`;
  const portalUrl = booking.tenant?.slug
    ? `${baseUrl}/${booking.tenant.slug}/login`
    : `${baseUrl}/portal/dashboard`;

  // WhatsApp Pre-filled URL formatting
  const whatsappUrl = React.useMemo(() => {
    let cleanPhone = (customer.phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    const message = `Hello ${customerName}, your shoot schedule for ${dateStr} is confirmed with Pratima Studio! Track your voucher & team here: ${voucherUrl}`;
    const encoded = encodeURIComponent(message);

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }, [customer.phone, customerName, dateStr, voucherUrl]);

  // Total Crew & Gear Rollup Counts
  const totalAssignedCrew = subEvents.reduce(
    (acc: number, se: any) => acc + (se.staffAssignments?.length || 0),
    0
  );
  const totalAllocatedGear = subEvents.reduce(
    (acc: number, se: any) => acc + (se.shootGearAllocations?.length || 0),
    0
  );

  // 1. Crew Assignment Handler
  const handleAssignCrew = async (subEventId: string) => {
    if (!selectedCrewId) {
      toast.error('Please select a crew member.');
      return;
    }
    if (!selectedRole) {
      toast.error('Please select an operational role.');
      return;
    }

    setIsAssigningCrew(true);
    try {
      const payoutNum = payoutAmount ? parseFloat(payoutAmount) : null;
      const res = await assignCrewToSubEvent(
        subEventId,
        selectedCrewId,
        selectedRole,
        payoutNum,
        crewNotes
      );

      if (!res.success) {
        toast.error(res.error || 'Failed to assign crew member.');
        return;
      }

      toast.success(res.message || 'Crew member assigned successfully.');
      setSelectedCrewId('');
      setPayoutAmount('');
      setCrewNotes('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Unexpected error assigning crew.');
    } finally {
      setIsAssigningCrew(false);
    }
  };

  // 2. Remove Crew Handler
  const handleRemoveCrew = async (assignmentId: string) => {
    setDeletingCrewId(assignmentId);
    try {
      const res = await removeCrewFromSubEvent(assignmentId);
      if (!res.success) {
        toast.error(res.error || 'Failed to remove crew assignment.');
        return;
      }
      toast.success(res.message || 'Crew assignment removed.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error removing crew member.');
    } finally {
      setDeletingCrewId(null);
    }
  };

  // 3. Gear Allocation Handler
  const handleAssignGear = async (subEventId: string) => {
    if (!selectedGearId) {
      toast.error('Please select an equipment item to reserve.');
      return;
    }

    setIsAllocatingGear(true);
    try {
      const res = await assignGearToSubEvent(subEventId, selectedGearId, gearNotes);

      if (!res.success) {
        toast.error(res.error || 'Failed to allocate equipment.');
        return;
      }

      toast.success(res.message || 'Equipment reserved successfully.');
      setSelectedGearId('');
      setGearNotes('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Unexpected error reserving equipment.');
    } finally {
      setIsAllocatingGear(false);
    }
  };

  // 4. Remove Gear Handler
  const handleRemoveGear = async (allocationId: string) => {
    setDeletingGearId(allocationId);
    try {
      const res = await removeGearFromSubEvent(allocationId);
      if (!res.success) {
        toast.error(res.error || 'Failed to deallocate equipment.');
        return;
      }
      toast.success(res.message || 'Equipment deallocated.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error deallocating equipment.');
    } finally {
      setDeletingGearId(null);
    }
  };

  // 5. Vehicle Allocation Handlers
  const handleAssignVehicle = async (subEventId: string) => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle to dispatch.');
      return;
    }

    setIsAllocatingVehicle(true);
    try {
      const res = await assignVehicleToSubEventAction({
        subEventId,
        vehicleId: selectedVehicleId,
        driverName: vehicleDriverName.trim() || undefined,
        driverPhone: vehicleDriverPhone.trim() || undefined,
        notes: vehicleNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || 'Vehicle allocated successfully.');
        setSelectedVehicleId('');
        setVehicleDriverName('');
        setVehicleDriverPhone('');
        setVehicleNotes('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to dispatch vehicle.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error assigning vehicle.');
    } finally {
      setIsAllocatingVehicle(false);
    }
  };

  const handleRemoveVehicle = async (vehicleBookingId: string) => {
    setDeletingVehicleBookingId(vehicleBookingId);
    try {
      const res = await removeVehicleFromSubEventAction(vehicleBookingId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to deallocate vehicle.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deallocating vehicle.');
    } finally {
      setDeletingVehicleBookingId(null);
    }
  };

  // 6. Create New SubEvent Handler
  const handleCreateSubEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEventName.trim()) {
      toast.error('Function name is required (e.g., Haldi, Sangeet, Wedding).');
      return;
    }

    setIsCreatingSubEvent(true);
    try {
      const res = await createSubEventAction({
        eventBookingId: booking.id,
        name: newSubEventName.trim(),
        eventDate: newSubEventDate,
        startTime: newSubEventStartTime,
        endTime: newSubEventEndTime,
        locationVenue: newSubEventVenue.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to create sub-event.');
        return;
      }

      toast.success(`Created function "${newSubEventName}".`);
      setNewSubEventName('');
      setShowAddSubEvent(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error creating sub-event.');
    } finally {
      setIsCreatingSubEvent(false);
    }
  };

  // 7. WhatsApp Dispatch Call Sheet Generator
  const handleDispatchCallSheet = (subEvent: any) => {
    const crewText = (subEvent.staffAssignments || [])
      .map(
        (sa: any) =>
          `• *${sa.user?.name || 'Staff'}* (${sa.role.replace(/_/g, ' ')}) - 📞 ${sa.user?.phone || 'N/A'}`
      )
      .join('\n');

    const gearText = (subEvent.shootGearAllocations || [])
      .map(
        (ga: any) =>
          `• [${ga.equipment?.category}] ${ga.equipment?.name} (${ga.equipment?.serialNumber || ga.equipment?.assetTag || 'ID'})`
      )
      .join('\n');

    const vehicleText = (subEvent.vehicleBookings || [])
      .map(
        (vb: any) =>
          `• *${vb.vehicle?.plateNumber}* (${vb.vehicle?.makeModel}) - 🚗 Driver: ${vb.driverName || vb.vehicle?.driverName || 'Studio Driver'} (📞 ${vb.driverPhone || vb.vehicle?.driverPhone || 'N/A'})`
      )
      .join('\n');

    const callSheet = `🎬 *OFFICIAL SHOOT CALL SHEET • FRAMIQ*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Event:* ${booking.title} (#${booking.bookingNumber})
✨ *Function:* ${subEvent.name}
📅 *Date:* ${formatDate(subEvent.eventDate, 'dd MMMM yyyy')}
⏰ *Call Time:* ${subEvent.startTime} - ${subEvent.endTime}
📍 *Venue:* ${subEvent.locationVenue || booking.location || 'Studio Location'}
👤 *Client:* ${customerName} (📞 ${customer.phone || 'N/A'})

👥 *ASSIGNED CREW ROSTER:*
${crewText || '• No crew assigned yet.'}

🎒 *RESERVED GEAR KIT:*
${gearText || '• Standard basic camera kit.'}

🚗 *LOGISTICS & TRANSPORT FLEET:*
${vehicleText || '• Self / Studio transit.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Please report 30 minutes prior to call time in official studio attire._`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(callSheet);
      toast.success('Call Sheet copied to clipboard! Ready to paste into WhatsApp crew group.');
    }

    const encoded = encodeURIComponent(callSheet);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const invoice = booking.invoice;
  const isPaid = invoice?.status === 'PAID';
  const totalAmount = Number(booking.totalAmount || invoice?.grandTotal || 0);
  const advanceAmount = Number(booking.advanceAmount || 0);
  const balanceDue = Math.max(0, totalAmount - advanceAmount);

  // Assemble voucher data object for printable preview tab
  const voucherData: BookingVoucherData = {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    title: booking.title,
    startDate: booking.startDate,
    endDate: booking.endDate,
    status: booking.status,
    journeyStatus: booking.journeyStatus,
    location: booking.location,
    notes: booking.notes,
    createdAt: booking.createdAt,
    customer: {
      id: customer.id || '',
      customerCode: customer.customerCode,
      name: customerName,
      phone: customer.phone,
      email: customer.email,
    },
    tenant: booking.tenant,
    invoice: invoice
      ? {
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: Number(invoice.grandTotal),
          status: invoice.status,
        }
      : undefined,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation & Action Header */}
      <div className="bg-card border-b -mx-6 -mt-6 p-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/operations/bookings')}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Back to Bookings Registry"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                #{booking.bookingNumber}
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground tracking-tight">
                {booking.title}
              </h1>
              <Badge
                variant="outline"
                className={
                  booking.status === 'CONFIRMED'
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold'
                    : 'border-primary/30 text-primary bg-primary/10 font-bold'
                }
              >
                <CalendarCheck className="w-3 h-3 mr-1" />
                {booking.status}
              </Badge>
              {booking.journeyStatus && (
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {booking.journeyStatus.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pl-10">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="w-3.5 h-3.5 text-primary" />
                {customerName} {customer.phone ? `(${customer.phone})` : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {dateStr}
              </span>
              {booking.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {booking.location}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(voucherUrl);
                  toast.success('Public voucher link copied to clipboard!');
                }
              }}
              className="text-xs h-9 gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Copy Link</span>
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3 rounded-lg shadow-2xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Share Voucher</span>
            </a>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('voucher')}
              className="text-xs h-9 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Voucher</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Budget
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold font-heading text-foreground">
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isPaid ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fully Settled
                  </span>
                ) : (
                  <span>Due: ₹{balanceDue.toLocaleString('en-IN')}</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Functions / Days
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold font-heading text-foreground">
                {subEvents.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">SubEvents</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Wedding shoot timeline</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Crew Allocated
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold font-heading text-primary">
                {totalAssignedCrew}{' '}
                <span className="text-xs font-normal text-muted-foreground">Staff Slots</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Photographers &amp; cinematographers</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gear Reserved
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                {totalAllocatedGear}{' '}
                <span className="text-xs font-normal text-muted-foreground">Items</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cameras, lenses &amp; drones</p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Command Center Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
            <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1">
              {subEvents.map((se: any, idx: number) => {
                const crewCount = se.staffAssignments?.length || 0;
                const gearCount = se.shootGearAllocations?.length || 0;
                const vehicleCount = se.vehicleBookings?.length || 0;
                return (
                  <TabsTrigger
                    key={se.id}
                    value={se.id}
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground text-xs py-2 px-3.5 rounded-lg font-medium flex items-center gap-2 shadow-2xs"
                  >
                    <span>{se.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({formatDate(se.eventDate, 'dd MMM')})
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-full">
                      {crewCount}C • {gearCount}G • {vehicleCount}V
                    </span>
                  </TabsTrigger>
                );
              })}

              <TabsTrigger
                value="voucher"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground text-xs py-2 px-3.5 rounded-lg font-medium flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Official Voucher &amp; Journey</span>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSubEvent(!showAddSubEvent)}
              className="text-xs gap-1.5 self-start sm:self-auto border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Function</span>
            </Button>
          </div>

          {/* New SubEvent Inline Form Modal / Collapse */}
          {showAddSubEvent && (
            <Card className="border-primary/40 bg-card shadow-sm animate-in fade-in-50 duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Add SubEvent / Function (e.g. Sangeet, Haldi, Reception)
                </CardTitle>
                <CardDescription className="text-xs">
                  Schedule an additional function under this booking to assign dedicated crew rosters and camera gear.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSubEvent} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Function Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sangeet"
                      required
                      value={newSubEventName}
                      onChange={(e) => setNewSubEventName(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Event Date *</label>
                    <input
                      type="date"
                      required
                      value={newSubEventDate}
                      onChange={(e) => setNewSubEventDate(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Call Times *</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={newSubEventStartTime}
                        onChange={(e) => setNewSubEventStartTime(e.target.value)}
                        className="w-1/2 text-xs h-9 px-2 rounded-md border bg-background text-foreground"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <input
                        type="time"
                        value={newSubEventEndTime}
                        onChange={(e) => setNewSubEventEndTime(e.target.value)}
                        className="w-1/2 text-xs h-9 px-2 rounded-md border bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Venue Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Grand Ballroom"
                      value={newSubEventVenue}
                      onChange={(e) => setNewSubEventVenue(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground"
                    />
                  </div>

                  <div className="flex items-end gap-2 sm:col-span-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isCreatingSubEvent}
                      className="w-full text-xs h-9 gap-1 font-semibold"
                    >
                      {isCreatingSubEvent ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Save Function</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddSubEvent(false)}
                      className="text-xs h-9"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* SubEvent Dispatch Workbenches */}
          {subEvents.map((subEvent: any) => {
            const crewAssignments = subEvent.staffAssignments || [];
            const gearAllocations = subEvent.shootGearAllocations || [];

            return (
              <TabsContent key={subEvent.id} value={subEvent.id} className="space-y-6 focus-visible:outline-none">
                {/* Function Header Banner */}
                <div className="rounded-xl border bg-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold font-heading text-foreground">{subEvent.name}</h2>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {crewAssignments.length} Crew • {gearAllocations.length} Gear
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {formatDate(subEvent.eventDate, 'EEEE, dd MMMM yyyy')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {subEvent.startTime} to {subEvent.endTime}
                      </span>
                      {subEvent.locationVenue && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {subEvent.locationVenue}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDispatchCallSheet(subEvent)}
                      className="text-xs h-8 gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp Call Sheet</span>
                    </Button>
                  </div>
                </div>

                {/* Two-Column Shoot Dispatch Workbench */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Crew Roster */}
                  <Card className="shadow-2xs flex flex-col justify-between">
                    <div>
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <CardTitle className="text-sm font-bold">Crew Roster &amp; Assignments</CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {crewAssignments.length} Assigned
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Assign lead photographers, cinematographers, and drone pilots for this function.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Currently Assigned Crew Table */}
                        {crewAssignments.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                            <Users className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                            <p className="text-xs font-semibold">No crew assigned yet</p>
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                              Select a staff member below to allocate them to this function.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {crewAssignments.map((assignment: any) => {
                              const isDeleting = deletingCrewId === assignment.id;
                              const isCheckedIn = Boolean(assignment.checkedInAt);
                              const hasHandover = Boolean(assignment.mediaCardsCount);

                              const rawPhone = (assignment.user?.phone || '').replace(/\D/g, '');
                              let waPhone = rawPhone;
                              if (waPhone.length === 10) waPhone = `91${waPhone}`;
                              else if (waPhone.startsWith('0') && waPhone.length === 11) waPhone = `91${waPhone.slice(1)}`;

                              const passLink = assignment.magicToken
                                ? `${baseUrl}/portal/crew/${assignment.magicToken}`
                                : '';

                              const waPassMessage = encodeURIComponent(
                                `🎬 *OFFICIAL SHOOT PASS • ${booking.tenant?.tradeName || booking.tenant?.name || 'PRATIMA STUDIO'}*\nHello ${assignment.user?.name || 'Crew Member'}, you are scheduled as *${assignment.role.replace(/_/g, ' ')}* for *${subEvent.name}* (${booking.title}).\n📅 *Date:* ${formatDate(subEvent.eventDate, 'dd MMM yyyy')}\n⏰ *Call Time:* ${subEvent.startTime} - ${subEvent.endTime}\n📍 *Venue:* ${subEvent.locationVenue || booking.location || 'Studio Location'}\n\n👉 *Your Digital Event Pass & Gear Checklist:* ${passLink}\n_PIN: Last 4 digits of your phone number._`
                              );
                              const waPassUrl = waPhone ? `https://wa.me/${waPhone}?text=${waPassMessage}` : `https://wa.me/?text=${waPassMessage}`;

                              return (
                                <div
                                  key={assignment.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                      {(assignment.user?.name || 'U').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-xs font-bold text-foreground truncate">
                                          {assignment.user?.name || 'Unknown Staff'}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-bold px-1.5 py-0 border-primary/20 text-primary uppercase"
                                        >
                                          {assignment.role.replace(/_/g, ' ')}
                                        </Badge>
                                        {isCheckedIn && (
                                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold py-0">
                                            ✓ Arrived ({formatDate(assignment.checkedInAt, 'hh:mm a')})
                                          </Badge>
                                        )}
                                        {hasHandover && (
                                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] font-bold py-0">
                                            📁 {assignment.mediaCardsCount} Cards {assignment.rawMediaSizeGb ? `(${assignment.rawMediaSizeGb} GB)` : ''}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                        {assignment.user?.phone && (
                                          <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {assignment.user.phone}
                                          </span>
                                        )}
                                        {assignment.payoutAmount && (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            • Payout: ₹{Number(assignment.payoutAmount).toLocaleString('en-IN')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Crew Magic Pass Action Strip */}
                                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                    {assignment.magicToken && (
                                      <>
                                        <a
                                          href={waPassUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="h-7 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                                          title="Send WhatsApp Magic Link Pass"
                                        >
                                          <MessageCircle className="w-3 h-3 fill-white" />
                                          <span>Pass</span>
                                        </a>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                              navigator.clipboard.writeText(passLink);
                                              toast.success(`Copied Shoot Pass Magic Link for ${assignment.user?.name || 'crew member'}!`);
                                            }
                                          }}
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                          title="Copy Magic Pass Link"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isDeleting}
                                      onClick={() => handleRemoveCrew(assignment.id)}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                      title="Unassign Crew Member"
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Inline Crew Assignment Form */}
                    <div className="p-4 border-t bg-muted/10 space-y-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        + Assign Crew Member
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Select Member */}
                        <div className="sm:col-span-5">
                          <select
                            value={selectedCrewId}
                            onChange={(e) => setSelectedCrewId(e.target.value)}
                            className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                          >
                            <option value="">Select Staff / Freelancer...</option>
                            {availableCrew.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.designation ? `(${c.designation})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Role */}
                        <div className="sm:col-span-4">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                          >
                            {CREW_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payout */}
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            placeholder="Payout (₹)"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            className="w-full text-xs h-9 px-2 rounded-md border bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isAssigningCrew || !selectedCrewId}
                        onClick={() => handleAssignCrew(subEvent.id)}
                        className="w-full text-xs h-8 font-semibold gap-1.5"
                      >
                        {isAssigningCrew ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking conflicts &amp; assigning...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign to {subEvent.name}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>

                  {/* Right Column: Gear Allocation */}
                  <Card className="shadow-2xs flex flex-col justify-between">
                    <div>
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <CardTitle className="text-sm font-bold">Equipment &amp; Camera Gear</CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {gearAllocations.length} Reserved
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Reserve camera bodies, prime lenses, lighting kits, and drones for this function.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Currently Allocated Gear List */}
                        {gearAllocations.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                            <Camera className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                            <p className="text-xs font-semibold">No equipment reserved yet</p>
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                              Select studio inventory below to lock gear for this function.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {gearAllocations.map((alloc: any) => {
                              const isDeleting = deletingGearId === alloc.id;
                              const eq = alloc.equipment;
                              return (
                                <div
                                  key={alloc.id}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                                      <Boxes className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-foreground truncate">
                                          {eq?.name || 'Equipment'}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-bold px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                        >
                                          {eq?.category}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span>
                                          SN: {eq?.serialNumber || eq?.assetTag || 'N/A'}
                                        </span>
                                        <span className="font-mono text-[10px] text-primary">
                                          • [{alloc.status}]
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={() => handleRemoveGear(alloc.id)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                    title="Deallocate Equipment"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Inline Gear Allocation Form */}
                    <div className="p-4 border-t bg-muted/10 space-y-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        + Reserve Equipment Item
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Select Equipment */}
                        <div className="sm:col-span-8">
                          <select
                            value={selectedGearId}
                            onChange={(e) => setSelectedGearId(e.target.value)}
                            className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                          >
                            <option value="">Select Equipment Item...</option>
                            {availableGear.map((g) => (
                              <option key={g.id} value={g.id}>
                                [{g.category}] {g.name} ({g.serialNumber || g.assetTag || 'ID'}) - {g.status}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Notes */}
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Kit Notes..."
                            value={gearNotes}
                            onChange={(e) => setGearNotes(e.target.value)}
                            className="w-full text-xs h-9 px-2 rounded-md border bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isAllocatingGear || !selectedGearId}
                        onClick={() => handleAssignGear(subEvent.id)}
                        className="w-full text-xs h-8 font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isAllocatingGear ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking availability &amp; locking...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Reserve for {subEvent.name}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Third Section: Vehicle / Transport Allocation */}
                <Card className="shadow-2xs">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-sm font-bold">Vehicle Fleet &amp; Transport Allocation</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {(subEvent.vehicleBookings || []).length} Dispatched
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Dispatch studio vans, SUVs, or equipment transport vehicles for crew transit and heavy camera haulage.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Dispatched Vehicles List */}
                    {(!subEvent.vehicleBookings || subEvent.vehicleBookings.length === 0) ? (
                      <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                        <Car className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-semibold">No transport dispatched for this function</p>
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Allocate a studio van or SUV below with automatic double-booking collision detection.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subEvent.vehicleBookings.map((vb: any) => {
                          const isDeleting = deletingVehicleBookingId === vb.id;
                          const veh = vb.vehicle;
                          return (
                            <div
                              key={vb.id}
                              className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  <Truck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded border">
                                      {veh?.plateNumber}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                                      {veh?.type || 'VAN'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                                    {veh?.makeModel}
                                  </p>
                                  <div className="text-[11px] text-muted-foreground mt-1">
                                    <span className="font-medium text-foreground">
                                      Driver: {vb.driverName || veh?.driverName || 'Studio Driver'}
                                    </span>
                                    {(vb.driverPhone || veh?.driverPhone) && (
                                      <span className="block text-[10px]">
                                        📞 {vb.driverPhone || veh?.driverPhone}
                                      </span>
                                    )}
                                  </div>
                                  {vb.notes && (
                                    <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                      "{vb.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isDeleting}
                                onClick={() => handleRemoveVehicle(vb.id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                title="Deallocate Vehicle"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>

                  {/* Inline Vehicle Allocation Form */}
                  <div className="p-4 border-t bg-muted/10 space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      + Dispatch Studio Vehicle
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      {/* Vehicle Select */}
                      <div className="sm:col-span-4">
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => {
                            const vId = e.target.value;
                            setSelectedVehicleId(vId);
                            const found = availableVehicles.find((v) => v.id === vId);
                            if (found) {
                              setVehicleDriverName(found.driverName || '');
                              setVehicleDriverPhone(found.driverPhone || '');
                            }
                          }}
                          className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                        >
                          <option value="">Select Vehicle...</option>
                          {availableVehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plateNumber} - {v.makeModel} ({v.type || 'VAN'}, {v.capacity || 5} Seater) [{v.status}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Driver Name */}
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Driver Name..."
                          value={vehicleDriverName}
                          onChange={(e) => setVehicleDriverName(e.target.value)}
                          className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                        />
                      </div>

                      {/* Driver Phone */}
                      <div className="sm:col-span-2">
                        <input
                          type="tel"
                          placeholder="Driver Phone..."
                          value={vehicleDriverPhone}
                          onChange={(e) => setVehicleDriverPhone(e.target.value)}
                          className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                        />
                      </div>

                      {/* Notes */}
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Transit Notes..."
                          value={vehicleNotes}
                          onChange={(e) => setVehicleNotes(e.target.value)}
                          className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isAllocatingVehicle || !selectedVehicleId}
                      onClick={() => handleAssignVehicle(subEvent.id)}
                      className="w-full text-xs h-8 font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isAllocatingVehicle ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking collision engine &amp; allocating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Dispatch Vehicle to {subEvent.name}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            );
          })}

          {/* Official Voucher & Client Journey Tracker Tab */}
          <TabsContent value="voucher" className="space-y-6 focus-visible:outline-none">
            {/* Journey Tracker Component */}
            <div className="bg-card border rounded-2xl p-6 shadow-2xs print:hidden">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Production &amp; Post-Sale Journey Status
              </h3>
              <JourneyTracker
                status={booking.journeyStatus || 'BOOKED'}
                bookingTitle={booking.title}
                eventDate={dateStr}
                location={booking.location}
              />
            </div>

            {/* Printable Voucher Document */}
            <BookingVoucherDocument booking={voucherData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
