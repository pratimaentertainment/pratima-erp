'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Wrench,
  Camera,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Phone,
  IndianRupee,
  SlidersHorizontal,
  Package,
  Layers,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  assignTeamMemberAndNotifyAction,
  sendEventRemindersAction,
  createEquipmentAction,
  updateEquipmentStatusAction,
} from '@/actions/dispatch.actions';
import { EquipmentCategory, AssetStatus } from '@prisma/client';

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
  'Editor / DIT',
];

interface DispatchClientProps {
  initialEvents: any[];
  initialInventory: any[];
  teamMembers: any[];
}

export function DispatchClient({
  initialEvents = [],
  initialInventory = [],
  teamMembers = [],
}: DispatchClientProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'inventory'>('events');
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [inventory, setInventory] = useState<any[]>(initialInventory);
  const [isPending, startTransition] = useTransition();

  // Event Filters
  const [eventSearch, setEventSearch] = useState('');

  // Equipment Filters
  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Assign Crew Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [agreedPayment, setAgreedPayment] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);

  // Add Equipment Modal State
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState<EquipmentCategory>(EquipmentCategory.CAMERA);
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [eqStatus, setEqStatus] = useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [eqNotes, setEqNotes] = useState('');
  const [isCreatingEquipment, setIsCreatingEquipment] = useState(false);

  // Status Change State
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [targetEquipment, setTargetEquipment] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = eventSearch.toLowerCase().trim();
      if (!q) return true;
      const titleMatch = ev.title?.toLowerCase().includes(q);
      const codeMatch = ev.bookingNumber?.toLowerCase().includes(q);
      const clientName = `${ev.customer?.firstName || ''} ${ev.customer?.lastName || ''}`.toLowerCase();
      const locationMatch = ev.location?.toLowerCase().includes(q);
      return titleMatch || codeMatch || clientName.includes(q) || locationMatch;
    });
  }, [events, eventSearch]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = inventorySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.modelNumber?.toLowerCase().includes(q) ||
        item.serialNumber?.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesStat = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesCat && matchesStat;
    });
  }, [inventory, inventorySearch, categoryFilter, statusFilter]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const total = inventory.length;
    const available = inventory.filter((i) => i.status === AssetStatus.AVAILABLE).length;
    const inUse = inventory.filter((i) => i.status === AssetStatus.IN_USE).length;
    const maintenance = inventory.filter((i) => i.status === AssetStatus.MAINTENANCE).length;
    return { total, available, inUse, maintenance };
  }, [inventory]);

  // Handle 24h Reminders Trigger
  const handleTriggerReminders = () => {
    startTransition(async () => {
      try {
        const res = await sendEventRemindersAction();
        if (res.success && res.data) {
          toast.success('24h Reminder Dispatch Finished', {
            description: `${res.data.totalRemindersSent} notifications sent across ${res.data.totalRemindedEvents} upcoming events.`,
          });
        } else {
          toast.error(res.error || 'Failed to trigger automated reminders');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred while dispatching reminders');
      }
    });
  };

  // Open Assign Crew Modal
  const handleOpenAssignModal = (booking: any) => {
    setSelectedBooking(booking);
    setSelectedUserId('');
    setSelectedRole('');
    setAgreedPayment('');
    setAssignmentNotes('');
    setLastWhatsAppUrl(null);
    setAssignModalOpen(true);
  };

  // Submit Assign Crew
  const handleSubmitCrewAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !selectedUserId || !selectedRole) {
      toast.error('Please select both a team member and a role');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await assignTeamMemberAndNotifyAction({
        bookingId: selectedBooking.id,
        userId: selectedUserId,
        role: selectedRole,
        agreedPayment: agreedPayment ? Number(agreedPayment) : null,
        notes: assignmentNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to assign team member');
        return;
      }

      const assignmentData = res.data.assignment;
      const directUrl = res.data.directWhatsAppUrl;
      setLastWhatsAppUrl(directUrl);

      // Update local event assignments
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== selectedBooking.id) return ev;
          const existing = ev.assignments || [];
          const idx = existing.findIndex(
            (a: any) => a.userId === selectedUserId && a.role === selectedRole
          );
          let nextAssignments;
          if (idx >= 0) {
            nextAssignments = [...existing];
            nextAssignments[idx] = assignmentData;
          } else {
            nextAssignments = [...existing, assignmentData];
          }
          return { ...ev, assignments: nextAssignments };
        })
      );

      toast.success(`Assigned to ${selectedRole} successfully!`, {
        description: res.data.notificationSent
          ? 'WhatsApp notification generated & dispatched'
          : 'Saved! Open WhatsApp to send direct itinerary.',
      });

      // If direct URL available, open in a new tab if desired or leave link visible
      if (directUrl && window.confirm('Assignment saved! Would you like to open WhatsApp now to send the itinerary?')) {
        window.open(directUrl, '_blank');
      }

      setAssignModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while assigning crew member');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Add Equipment
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim()) {
      toast.error('Please provide an equipment name');
      return;
    }

    setIsCreatingEquipment(true);
    try {
      const res = await createEquipmentAction({
        name: eqName,
        category: eqCategory,
        brand: eqBrand,
        modelNumber: eqModel,
        serialNumber: eqSerial,
        status: eqStatus,
        notes: eqNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to add equipment');
        return;
      }

      setInventory((prev) => [res.data, ...prev]);
      toast.success(`"${eqName}" added to inventory!`);
      setEquipmentModalOpen(false);

      // Reset form
      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
      setEqNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Error creating equipment item');
    } finally {
      setIsCreatingEquipment(false);
    }
  };

  // Open Equipment Status Modal
  const handleOpenStatusModal = (item: any) => {
    setTargetEquipment(item);
    setNewStatus(item.status);
    setStatusNote(item.notes || '');
    setStatusChangeModalOpen(true);
  };

  // Submit Status Change
  const handleSubmitStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEquipment) return;

    setIsUpdatingStatus(true);
    try {
      const res = await updateEquipmentStatusAction({
        equipmentId: targetEquipment.id,
        status: newStatus,
        notes: statusNote,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to update equipment status');
        return;
      }

      setInventory((prev) =>
        prev.map((i) => (i.id === targetEquipment.id ? { ...i, status: newStatus, notes: statusNote } : i))
      );
      toast.success(`Equipment status updated to ${newStatus}`);
      setStatusChangeModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Format helper for Indian Rupee
  const formatINR = (amount: number | null | undefined) => {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Operations Dispatch & Inventory Hub</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Step 6 Active
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Allocate crew specialists, track payouts, dispatch automated WhatsApp reminders, and oversee gear inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerReminders}
            disabled={isPending}
            className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            {isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-emerald-600" />
            )}
            Send 24h Event Reminders
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event Dispatch & Crew ({events.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipment Inventory ({inventory.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: EVENT DISPATCH & CREW ALLOCATION */}
        <TabsContent value="events" className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, clients, venues..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Showing {filteredEvents.length} scheduled assignment{filteredEvents.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="space-y-3">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto stroke-1" />
                <h3 className="text-lg font-medium">No Upcoming Events Found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  There are no confirmed or blocked events matching your filter. Transition accepted quotes or add new bookings to start crew dispatching.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {filteredEvents.map((booking) => {
                const sDate = formatDate(booking.startDate, 'dd MMM yyyy');
                const eDate = booking.endDate ? formatDate(booking.endDate, 'dd MMM yyyy') : null;
                const dateDisplay = eDate && eDate !== sDate ? `${sDate} - ${eDate}` : sDate;
                const assignments = booking.assignments || [];

                return (
                  <Card key={booking.id} className="border-border/80 shadow-xs hover:border-primary/50 transition-all">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono font-medium">
                              {booking.bookingNumber}
                            </Badge>
                            <Badge
                              className={
                                booking.status === 'CONFIRMED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg font-bold mt-1.5">{booking.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5 mt-0.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {booking.customer?.firstName} {booking.customer?.lastName}
                            </span>
                            {booking.customer?.phone && (
                              <span className="text-xs text-muted-foreground">
                                ({booking.customer.phone})
                              </span>
                            )}
                          </CardDescription>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenAssignModal(booking)}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign Crew
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      {/* Meta Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">{dateDisplay}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate text-foreground" title={booking.location || 'Location TBA'}>
                            {booking.location || 'Location TBA'}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Crew List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Assigned Crew ({assignments.length})
                          </span>
                        </div>

                        {assignments.length === 0 ? (
                          <div className="p-3 rounded-md bg-muted/40 border border-dashed border-border text-center text-xs text-muted-foreground">
                            No crew members assigned yet. Click &quot;Assign Crew&quot; to allocate team members.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {assignments.map((asg: any) => {
                              const staff = asg.user;
                              const cleanPhone = (staff?.phone || '').replace(/\D/g, '');
                              const directUrl = cleanPhone
                                ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(
                                    `Hello ${staff?.name || 'Crew Member'}, event reminder for ${booking.title} on ${dateDisplay}. Role: ${asg.role}. Payout: ${formatINR(asg.agreedPayment)}.`
                                  )}`
                                : null;

                              return (
                                <div
                                  key={asg.id}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card/60 hover:bg-muted/30 transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                      {(staff?.name || 'C')[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                        <span>{staff?.name || 'Assigned Staff'}</span>
                                        {staff?.employmentType && (
                                          <span className="text-[10px] text-muted-foreground font-normal">
                                            ({staff.employmentType})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-muted-foreground text-[11px] truncate flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                          {asg.role}
                                        </Badge>
                                        {asg.agreedPayment != null && (
                                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatINR(asg.agreedPayment)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Badges & WhatsApp Trigger */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {asg.notificationSent ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-[10px] py-0.5"
                                        title={asg.notificationSentAt ? `Sent at ${formatDate(asg.notificationSentAt, 'dd MMM hh:mm a')}` : 'Notification dispatched'}
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>WhatsApp Sent</span>
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 text-[10px] py-0.5"
                                      >
                                        <Clock className="h-3 w-3" />
                                        <span>Pending</span>
                                      </Badge>
                                    )}

                                    {directUrl && (
                                      <a
                                        href={directUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open WhatsApp Itinerary"
                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: EQUIPMENT INVENTORY */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Metric Stats Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Total Gear Items
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold">{inventoryStats.total}</div>
                <p className="text-[11px] text-muted-foreground">Registered in inventory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {inventoryStats.available}
                </div>
                <p className="text-[11px] text-muted-foreground">Ready for dispatch</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                  In Use / On Shoot
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {inventoryStats.inUse}
                </div>
                <p className="text-[11px] text-muted-foreground">Checked out to shoots</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                  In Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {inventoryStats.maintenance}
                </div>
                <p className="text-[11px] text-muted-foreground">Servicing / Calibration</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search item name, brand, model, serial..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'ALL')}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {Object.values(EquipmentCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.values(AssetStatus).map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setEquipmentModalOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Equipment Item
            </Button>
          </div>

          {/* Inventory Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No equipment items match the current criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-foreground">{item.name}</div>
                        {(item.brand || item.modelNumber) && (
                          <div className="text-xs text-muted-foreground">
                            {[item.brand, item.modelNumber].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.serialNumber ? (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-sm border">
                            {item.serialNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.status === AssetStatus.AVAILABLE
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : item.status === AssetStatus.IN_USE
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : item.status === AssetStatus.MAINTENANCE
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.branch?.name || 'Studio Main Vault'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenStatusModal(item)}
                          className="h-8 text-xs"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: ASSIGN CREW MEMBER */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmitCrewAssignment}>
            <DialogHeader>
              <DialogTitle>Assign Crew Specialist</DialogTitle>
              <DialogDescription>
                Allocate a crew member to &quot;{selectedBooking?.title}&quot; ({selectedBooking?.bookingNumber}) with agreed payout & automated WhatsApp briefing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Select Team Member */}
              <div className="space-y-1.5">
                <Label htmlFor="crew-member">Select Team Member *</Label>
                <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || '')}>
                  <SelectTrigger id="crew-member">
                    <SelectValue placeholder="Choose crew member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({member.designation || member.employmentType})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="crew-role">Operational Role *</Label>
                <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val || '')}>
                  <SelectTrigger id="crew-role">
                    <SelectValue placeholder="Select or type role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_PRESETS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agreed Payment */}
              <div className="space-y-1.5">
                <Label htmlFor="agreed-payment">Agreed Payout (₹ INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    id="agreed-payment"
                    type="number"
                    min="0"
                    placeholder="e.g. 8000"
                    value={agreedPayment}
                    onChange={(e) => setAgreedPayment(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Day rate or contractual fee for this assignment.
                </p>
              </div>

              {/* Assignment Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="assignment-notes">Briefing Notes & Gear Requirements</Label>
                <Textarea
                  id="assignment-notes"
                  rows={3}
                  placeholder="e.g. Bring 70-200mm f/2.8 & dual gimbal. Arrive 30 mins before baraat entry."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAssigning}>
                {isAssigning ? 'Dispatching...' : 'Confirm Assignment & Notify'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD EQUIPMENT ITEM */}
      <Dialog open={equipmentModalOpen} onOpenChange={setEquipmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateEquipment}>
            <DialogHeader>
              <DialogTitle>Register Equipment Item</DialogTitle>
              <DialogDescription>
                Add cameras, lenses, lighting, or drones to the studio inventory vault.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="eq-name">Item Name *</Label>
                <Input
                  id="eq-name"
                  placeholder="e.g. Sony Alpha 7 IV Mirrorless"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="eq-cat">Category *</Label>
                  <Select
                    value={eqCategory}
                    onValueChange={(val) => {
                      if (val) setEqCategory(val as EquipmentCategory);
                    }}
                  >
                    <SelectTrigger id="eq-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EquipmentCategory).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eq-stat">Initial Status</Label>
                  <Select
                    value={eqStatus}
                    onValueChange={(val) => {
                      if (val) setEqStatus(val as AssetStatus);
                    }}
                  >
                    <SelectTrigger id="eq-stat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AssetStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="eq-brand">Brand</Label>
                  <Input
                    id="eq-brand"
                    placeholder="e.g. Sony, DJI, Canon"
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eq-model">Model Number</Label>
                  <Input
                    id="eq-model"
                    placeholder="e.g. ILCE-7M4"
                    value={eqModel}
                    onChange={(e) => setEqModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eq-serial">Serial Number</Label>
                <Input
                  id="eq-serial"
                  placeholder="e.g. SN-892184910"
                  value={eqSerial}
                  onChange={(e) => setEqSerial(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eq-notes">Notes / Accessories Included</Label>
                <Textarea
                  id="eq-notes"
                  rows={2}
                  placeholder="e.g. Includes 2 batteries, dual charger, and Pelican case #4"
                  value={eqNotes}
                  onChange={(e) => setEqNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEquipmentModalOpen(false)}
                disabled={isCreatingEquipment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingEquipment}>
                {isCreatingEquipment ? 'Saving...' : 'Add to Inventory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: UPDATE EQUIPMENT STATUS */}
      <Dialog open={statusChangeModalOpen} onOpenChange={setStatusChangeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitStatusChange}>
            <DialogHeader>
              <DialogTitle>Update Equipment Operational Status</DialogTitle>
              <DialogDescription>
                Change state for &quot;{targetEquipment?.name}&quot; ({targetEquipment?.serialNumber || 'No S/N'})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="update-stat">Operational Status *</Label>
                <Select
                  value={newStatus}
                  onValueChange={(val) => {
                    if (val) setNewStatus(val as AssetStatus);
                  }}
                >
                  <SelectTrigger id="update-stat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssetStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status-note">Maintenance or Location Notes</Label>
                <Textarea
                  id="status-note"
                  rows={3}
                  placeholder="e.g. Sensor cleaned on 15 Sept. Firmware updated to v3.01."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusChangeModalOpen(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
