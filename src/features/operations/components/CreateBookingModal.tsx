'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CalendarPlus,
  Calendar,
  MapPin,
  User,
  Users,
  Phone,
  Mail,
  Plus,
  Trash2,
  Search,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  UserPlus,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createManualBookingAction,
  searchCustomersAction,
  checkConcurrentEventsAction,
  getAvailableStaffAction,
} from '@/actions/booking.actions';
import type { ConcurrentWarningPayload } from '@/services/booking.service';

export interface CreateBookingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (booking: any) => void;
  initialDate?: string | Date;
}

interface CustomerOption {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  customerCode: string;
}

const EVENT_PRESETS = [
  'Wedding',
  'Pre-Wedding',
  'Reception',
  'Engagement',
  'Haldi & Mehendi',
  'Sangeet',
  'Maternity',
  'Corporate',
];

const COMMON_ROLES = [
  'Lead Photographer',
  'Candid Photographer',
  'Traditional Photographer',
  'Lead Cinematographer',
  'Cinematographer',
  'Drone Pilot',
  'Sound & Light Technician',
  'Production Assistant',
  'Editor / DIT',
];

export function CreateBookingModal({
  isOpen,
  onOpenChange,
  onSuccess,
  initialDate,
}: CreateBookingModalProps) {
  const router = useRouter();

  // Initial date string resolution
  const defaultDateStr = React.useMemo(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [initialDate]);

  // Form Fields
  const [title, setTitle] = React.useState('');
  const [selectedPreset, setSelectedPreset] = React.useState('Wedding');
  const [startDate, setStartDate] = React.useState(defaultDateStr);
  const [endDate, setEndDate] = React.useState(defaultDateStr);
  const [location, setLocation] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Customer Search & Inline Creation States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<CustomerOption[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [isInlineCreate, setIsInlineCreate] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [newCustomerPhone, setNewCustomerPhone] = React.useState('');
  const [newCustomerEmail, setNewCustomerEmail] = React.useState('');

  // Crew Assignment State
  const [showStaffSection, setShowStaffSection] = React.useState(false);
  const [availableStaff, setAvailableStaff] = React.useState<any[]>([]);
  const [assignedStaff, setAssignedStaff] = React.useState<Array<{ userId: string; role: string; notes?: string }>>([]);

  // Concurrency Soft-Lock Warning
  const [concurrencyPayload, setConcurrencyPayload] = React.useState<ConcurrentWarningPayload | null>(null);
  const [isCheckingConcurrency, setIsCheckingConcurrency] = React.useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStartDate(defaultDateStr);
      setEndDate(defaultDateStr);
      setTitle('');
      setLocation('');
      setNotes('');
      setSelectedCustomer(null);
      setIsInlineCreate(false);
      setSearchQuery('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setAssignedStaff([]);
      setShowStaffSection(false);

      // Load initial recent customers
      searchCustomers('');
      // Load available staff
      loadStaff();
    }
  }, [isOpen, defaultDateStr]);

  // Search customers helper
  const searchCustomers = async (q: string) => {
    try {
      setIsSearchingCustomers(true);
      const res = await searchCustomersAction(q);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('[SEARCH_CUSTOMERS_ERROR]', err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  // Load staff helper
  const loadStaff = async () => {
    try {
      const res = await getAvailableStaffAction();
      if (res.success && res.data) {
        setAvailableStaff(res.data);
      }
    } catch (err) {
      console.error('[LOAD_STAFF_ERROR]', err);
    }
  };

  // Debounced search when searchQuery changes
  React.useEffect(() => {
    if (!isOpen || isInlineCreate || selectedCustomer) return;
    const timer = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, isInlineCreate, selectedCustomer]);

  // Concurrency check debounced when dates change
  React.useEffect(() => {
    if (!isOpen || !startDate) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsCheckingConcurrency(true);
        const res = await checkConcurrentEventsAction({
          startDate,
          endDate: endDate || startDate,
        });

        if (active && res.success && res.data) {
          setConcurrencyPayload(res.data);
        }
      } catch (err) {
        console.error('[CONCURRENCY_CHECK_FAILED]', err);
      } finally {
        if (active) setIsCheckingConcurrency(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [startDate, endDate, isOpen]);

  // Auto-fill title helper
  const updateTitleFromContext = (customerName: string, preset = selectedPreset) => {
    if (!customerName) return;
    setTitle(`${preset} Shoot - ${customerName}`);
  };

  // Preset pill click
  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    const clientName = selectedCustomer?.name || newCustomerName.trim();
    if (clientName) {
      updateTitleFromContext(clientName, preset);
    } else if (!title || EVENT_PRESETS.some((p) => title.startsWith(p))) {
      setTitle(`${preset} Shoot`);
    }
  };

  // Handle select customer from search
  const handleSelectCustomer = (cust: CustomerOption) => {
    setSelectedCustomer(cust);
    setIsInlineCreate(false);
    setSearchQuery('');
    updateTitleFromContext(cust.name);
  };

  // Handle switch to inline create
  const handleSwitchToInlineCreate = () => {
    setIsInlineCreate(true);
    setSelectedCustomer(null);
    if (searchQuery.trim()) {
      setNewCustomerName(searchQuery.trim());
      updateTitleFromContext(searchQuery.trim());
    }
  };

  // Handle staff row operations
  const handleAddStaffRow = () => {
    if (availableStaff.length === 0) {
      toast.info('No active team members found.');
      return;
    }
    const defaultUser = availableStaff[0].id;
    setAssignedStaff((prev) => [...prev, { userId: defaultUser, role: COMMON_ROLES[0] }]);
  };

  const handleRemoveStaffRow = (index: number) => {
    setAssignedStaff((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStaffChange = (index: number, field: 'userId' | 'role', val: string) => {
    setAssignedStaff((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Customer
    if (!selectedCustomer && !isInlineCreate) {
      toast.error('Please select an existing client or create a new client.');
      return;
    }

    if (isInlineCreate) {
      if (!newCustomerName.trim()) {
        toast.error('Customer name is required.');
        return;
      }
      if (!newCustomerPhone.trim()) {
        toast.error('Customer phone number is required.');
        return;
      }
    }

    // 2. Validate Booking Details
    if (!title.trim()) {
      toast.error('Event title is required.');
      return;
    }

    if (!startDate) {
      toast.error('Event start date is required.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await createManualBookingAction({
        customerId: !isInlineCreate && selectedCustomer ? selectedCustomer.id : undefined,
        customerName: isInlineCreate ? newCustomerName.trim() : undefined,
        customerPhone: isInlineCreate ? newCustomerPhone.trim() : undefined,
        customerEmail: isInlineCreate && newCustomerEmail.trim() ? newCustomerEmail.trim() : undefined,
        title: title.trim(),
        startDate,
        endDate: endDate || startDate,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedStaff: assignedStaff.length > 0 ? assignedStaff : undefined,
        createProject: true,
      });

      if (res.success) {
        toast.success(
          res.data?.concurrentWarning?.hasConcurrentEvents
            ? 'Booking created successfully with concurrent event soft-lock.'
            : 'Event booking created & initialized in Post-Production!'
        );
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(res.data?.booking);
        }
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create booking.');
      }
    } catch (err: any) {
      console.error('[CREATE_BOOKING_ERROR]', err);
      toast.error(err?.message || 'An unexpected error occurred while creating booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create New Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Direct booking for walk-in or returning clients. Auto-initializes post-production & projects.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* SECTION 1: CUSTOMER SELECTION & INLINE CREATION */}
          <div className="space-y-2 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                Client Selection
              </Label>
              {!isInlineCreate && !selectedCustomer && (
                <button
                  type="button"
                  onClick={handleSwitchToInlineCreate}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Walk-in Client
                </button>
              )}
            </div>

            {/* Mode A: Selected Customer View */}
            {selectedCustomer && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {selectedCustomer.firstName?.[0] || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {selectedCustomer.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-indigo-200 text-indigo-700 dark:text-indigo-300">
                        {selectedCustomer.customerCode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                      {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                  className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Mode B: Inline Create Client Form */}
            {isInlineCreate && (
              <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    New Walk-in Client Details
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInlineCreate(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                      setNewCustomerEmail('');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={newCustomerName}
                      onChange={(e) => {
                        setNewCustomerName(e.target.value);
                        updateTitleFromContext(e.target.value);
                      }}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. +91 9876543210"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Email Address (Optional)
                    </Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode C: Smart Search Autocomplete */}
            {!selectedCustomer && !isInlineCreate && (
              <div className="relative space-y-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search client by name, phone, or code (e.g. CUST-001)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white dark:bg-slate-900"
                  />
                  {isSearchingCustomers && (
                    <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {/* Dropdown Results List */}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
                  {searchResults.length > 0 ? (
                    searchResults.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="p-2.5 px-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {cust.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            {cust.phone && <span>{cust.phone}</span>}
                            {cust.email && <span>• {cust.email}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-600 dark:text-slate-300">
                          {cust.customerCode}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      {isSearchingCustomers ? (
                        <span>Searching clients...</span>
                      ) : (
                        <div className="space-y-1.5">
                          <span>No existing client found for &quot;{searchQuery}&quot;.</span>
                          <div>
                            <button
                              type="button"
                              onClick={handleSwitchToInlineCreate}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              + Create &quot;{searchQuery || 'New Client'}&quot; instantly
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: EVENT DETAILS */}
          <div className="space-y-4">
            {/* Quick Presets */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Quick Ceremony / Event Types
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedPreset === preset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Title */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Wedding Shoot - Sharma"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            {/* Dates (Start & End) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Venue / Location
              </Label>
              <Input
                placeholder="e.g. Grand Ballroom, The Oberoi, Mumbai"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* Soft Warning Concurrency Alert */}
            {concurrencyPayload?.hasConcurrentEvents && (
              <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2 text-amber-950 dark:text-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Schedule Notice</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-300 dark:border-amber-700 bg-amber-100/50 text-amber-800 dark:text-amber-300 font-medium">
                    Soft Warning • Proceed Allowed
                  </Badge>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  {concurrencyPayload.warningMessage || "Note: There is another booking on this date. You can still proceed."}
                </p>
                {concurrencyPayload.events.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-amber-200/80 dark:border-amber-900/60">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 tracking-wider">
                      Overlapping Event Details ({concurrencyPayload.totalConcurrent}):
                    </span>
                    {concurrencyPayload.events.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="text-[11px] text-amber-900/90 dark:text-amber-200/90 flex items-center justify-between">
                        <span>• <span className="font-semibold">{ev.title}</span> ({ev.bookingNumber})</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">Client: {ev.customerName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Operational Notes / Directives
              </Label>
              <Textarea
                placeholder="Special requirements, drone permits, specific shots, or arrival timing..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs resize-none"
                rows={2}
              />
            </div>

            {/* SECTION 3: CREW ASSIGNMENT (COLLAPSIBLE) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Crew Roster & Gear Allocation
                  </span>
                  {assignedStaff.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {assignedStaff.length} Allocated
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowStaffSection(!showStaffSection);
                    if (!showStaffSection && assignedStaff.length === 0) {
                      handleAddStaffRow();
                    }
                  }}
                  className="h-7 text-xs"
                >
                  {showStaffSection ? 'Hide Roster' : '+ Allocate Crew'}
                </Button>
              </div>

              {showStaffSection && (
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {assignedStaff.map((staff, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={staff.userId}
                        onChange={(e) => handleStaffChange(idx, 'userId', e.target.value)}
                        className="flex-1 h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2"
                      >
                        {availableStaff.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.designation ? `(${u.designation})` : ''}
                          </option>
                        ))}
                      </select>

                      <select
                        value={staff.role}
                        onChange={(e) => handleStaffChange(idx, 'role', e.target.value)}
                        className="w-44 h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2"
                      >
                        {COMMON_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStaffRow(idx)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddStaffRow}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 h-7 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Team Member
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 h-9"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                  Create Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
