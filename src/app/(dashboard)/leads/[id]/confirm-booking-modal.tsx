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
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  checkConcurrentEventsAction,
  confirmBookingAction,
  getAvailableStaffAction,
} from '@/actions/booking.actions';
import type { ConcurrentWarningPayload } from '@/services/booking.service';
import { toast } from 'sonner';

export interface ConfirmBookingModalProps {
  lead: {
    id: string;
    leadCode?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    eventType?: string;
    expectedBookingDate?: string | Date | null;
    inquiry?: {
      eventDate?: string | Date | null;
      eventType?: string | null;
      notes?: string | null;
    } | null;
    customer?: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
    } | null;
    quotations?: Array<{
      id: string;
      quoteNumber?: string;
      quotationNumber?: string;
      status: string;
      grandTotal?: number;
      totalAmount?: number;
    }>;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (booking: any) => void;
}

const COMMON_ROLES = [
  'Lead Photographer',
  'Candid Photographer',
  'Traditional Photographer',
  'Lead Cinematographer',
  'Cinematographer',
  'Drone Pilot',
  'Sound & Light Technician',
  'Production Assistant',
  'Album Designer / Editor',
];

export function ConfirmBookingModal({
  lead,
  isOpen,
  onOpenChange,
  onSuccess,
}: ConfirmBookingModalProps) {
  const router = useRouter();

  const clientName =
    lead.customer?.name ||
    [lead.customer?.firstName, lead.customer?.lastName].filter(Boolean).join(' ').trim() ||
    lead.customerName ||
    'Client';

  // Initial date resolution
  const initialDateStr = React.useMemo(() => {
    const raw = lead.inquiry?.eventDate || lead.expectedBookingDate;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  }, [lead]);

  // Form states
  const [startDate, setStartDate] = React.useState<string>(initialDateStr);
  const [endDate, setEndDate] = React.useState<string>(initialDateStr);
  const [title, setTitle] = React.useState<string>(
    `${lead.eventType || lead.inquiry?.eventType || 'Event'} Shoot - ${clientName}`
  );
  const [location, setLocation] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');

  // Selected Quotation
  const acceptedQuote = lead.quotations?.find((q) => q.status === 'ACCEPTED');
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>(
    acceptedQuote?.id || lead.quotations?.[0]?.id || ''
  );

  // Staff assignments
  const [assignedStaff, setAssignedStaff] = React.useState<Array<{ userId: string; role: string }>>([]);
  const [availableStaff, setAvailableStaff] = React.useState<
    Array<{ id: string; name: string; email: string | null; designation: string | null }>
  >([]);

  // Concurrency inspection states
  const [isCheckingConcurrency, setIsCheckingConcurrency] = React.useState<boolean>(false);
  const [concurrencyPayload, setConcurrencyPayload] = React.useState<ConcurrentWarningPayload | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStartDate(initialDateStr);
      setEndDate(initialDateStr);
      setTitle(`${lead.eventType || lead.inquiry?.eventType || 'Event'} Shoot - ${clientName}`);
      setLocation('');
      setNotes('');
      setAssignedStaff([]);
      // Fetch staff
      getAvailableStaffAction().then((res) => {
        if (res.success && res.data) {
          setAvailableStaff(res.data);
        }
      });
    }
  }, [isOpen, initialDateStr, lead, clientName]);

  // Trigger concurrency check whenever startDate or endDate changes
  React.useEffect(() => {
    if (!isOpen || !startDate) return;

    let active = true;
    setIsCheckingConcurrency(true);

    const timer = setTimeout(async () => {
      try {
        const res = await checkConcurrentEventsAction({
          startDate,
          endDate: endDate || startDate,
        });

        if (active && res.success && res.data) {
          setConcurrencyPayload(res.data);
        }
      } catch (err) {
        console.error('Concurrency check failed', err);
      } finally {
        if (active) {
          setIsCheckingConcurrency(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, startDate, endDate]);

  const handleAddStaffRow = () => {
    if (availableStaff.length === 0) {
      toast.info('No staff members registered under this studio.');
      return;
    }
    const defaultStaff = availableStaff[0].id;
    setAssignedStaff((prev) => [...prev, { userId: defaultStaff, role: COMMON_ROLES[0] }]);
  };

  const handleRemoveStaffRow = (index: number) => {
    setAssignedStaff((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStaffChange = (index: number, field: 'userId' | 'role', val: string) => {
    setAssignedStaff((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast.error('Please specify the event start date.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await confirmBookingAction({
        leadId: lead.id,
        quotationId: selectedQuotationId || undefined,
        startDate,
        endDate: endDate || startDate,
        title,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedStaff: assignedStaff.length > 0 ? assignedStaff : undefined,
      });

      if (res.success) {
        toast.success(
          res.data.concurrentWarning.hasConcurrentEvents
            ? 'Booking confirmed with concurrent event soft-lock.'
            : 'Event booking successfully confirmed and locked!'
        );
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(res.data.booking);
        }
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to confirm booking.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while confirming booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-2">
            <CalendarCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Confirm & Schedule Booking
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Lock production dates for <strong className="text-slate-800">{clientName}</strong>, convert this lead to <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold ml-1">WON</Badge>, and allocate crew resources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Schedule Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Event Start Date *
              </Label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Event End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          {/* Dynamic Non-Blocking Concurrent Event Warning (Soft Lock) */}
          <div className="transition-all duration-200">
            {isCheckingConcurrency ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 py-1 px-3 bg-slate-50 rounded-lg border border-slate-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Checking date concurrency & studio crew availability...</span>
              </div>
            ) : concurrencyPayload?.hasConcurrentEvents ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      Resource Notice: {concurrencyPayload.totalConcurrent} Concurrent Event
                      {concurrencyPayload.totalConcurrent > 1 ? 's' : ''} Already Scheduled
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                      {concurrencyPayload.warningMessage}
                    </p>
                  </div>
                </div>

                {/* Overlapping Events Breakdown with Assigned Staff */}
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Existing Bookings on this Date:
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {concurrencyPayload.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="bg-white/90 border border-amber-200 rounded-lg p-2.5 text-[11px] space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{evt.title}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {evt.bookingNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 text-[10px]">
                          <span>Client: {evt.customerName}</span>
                          {evt.location && <span>Venue: {evt.location}</span>}
                        </div>
                        {/* Assigned Crew List */}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-semibold text-slate-500">Crew Assigned:</span>
                          {evt.assignedStaff && evt.assignedStaff.length > 0 ? (
                            evt.assignedStaff.map((staff, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-[9px] py-0 px-1.5 bg-amber-100/70 text-amber-900 border border-amber-200"
                              >
                                {staff.name} ({staff.role})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">No crew assigned yet</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-amber-800/90 italic pt-0.5">
                  <Info className="w-3 h-3 text-amber-600" />
                  <span>
                    Note: There is another booking on this date. You can still proceed.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-emerald-800 py-1.5 px-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Schedule Clear: No conflicting bookings recorded for this date.</span>
              </div>
            )}
          </div>

          {/* Booking Title & Venue Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Booking Title *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Wedding Photography - Client Name"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Shoot Venue / Location
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Grand Palace Hotel, Mumbai"
                className="text-xs"
              />
            </div>
          </div>

          {/* Linked Quotation Selector */}
          {lead.quotations && lead.quotations.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Link Approved Quotation</Label>
              <select
                value={selectedQuotationId}
                onChange={(e) => setSelectedQuotationId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- None / Custom Booking --</option>
                {lead.quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quoteNumber || q.quotationNumber || 'Proposal'} — {formatMoney(Number(q.grandTotal || q.totalAmount || 0), 'INR')} ({q.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Crew / Staff Assignment Section */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Allocate Crew Members (Optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStaffRow}
                className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" />
                Add Crew
              </Button>
            </div>

            {assignedStaff.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {assignedStaff.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={row.userId}
                      onChange={(e) => handleStaffChange(idx, 'userId', e.target.value)}
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {availableStaff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.designation ? `(${st.designation})` : ''}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.role}
                      onChange={(e) => handleStaffChange(idx, 'role', e.target.value)}
                      className="w-44 h-8 rounded-md border border-input bg-background px-2 text-xs"
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
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No crew allocated yet. You can assign photographers and cinematographers now or later via the calendar.
              </p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="space-y-1 border-t border-slate-200 pt-3">
            <Label className="text-xs font-semibold text-slate-700">Internal Booking Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special client instructions, key contact person phone, or deliverable highlights..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !startDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Confirming Booking...
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  Confirm & Lock Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
