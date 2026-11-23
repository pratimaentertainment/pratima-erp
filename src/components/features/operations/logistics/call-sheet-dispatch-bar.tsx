'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  FileText,
  Send,
  MessageCircle,
  Copy,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Package,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { generateAndDispatchCallSheetAction } from '@/actions/shoot-logistics.actions';

export interface CallSheetDispatchBarProps {
  booking: any;
  teamMembers: any[];
  onRefresh: () => void;
  className?: string;
}

export function CallSheetDispatchBar({
  booking,
  teamMembers,
  onRefresh,
  className,
}: CallSheetDispatchBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportingVenue, setReportingVenue] = useState('');
  const [callTime, setCallTime] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [dressCode, setDressCode] = useState('All Black Professional');
  const [specialNotes, setSpecialNotes] = useState('');
  const [leadDirectorId, setLeadDirectorId] = useState<string>('none');
  const [selectedSubEventId, setSelectedSubEventId] = useState<string>('all');
  const [selectedCrewUserIds, setSelectedCrewUserIds] = useState<string[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedUrls, setDispatchedUrls] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const subEvents = booking?.subEvents || [];
  const existingCallSheet = (booking?.callSheets || [])[0];
  const dispatchLogs = existingCallSheet?.dispatchLogs || [];

  // Compile unique assigned crew across booking and sub-events
  const uniqueCrew = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; role: string; phone: string; expectedGearList?: string | null }
    >();

    // From booking assignments
    (booking?.assignments || []).forEach((asg: any) => {
      if (asg.user) {
        map.set(asg.user.id, {
          id: asg.user.id,
          name: asg.user.name || 'Staff Member',
          role: asg.role,
          phone: asg.user.phone || '',
          expectedGearList: asg.expectedGearList || null,
        });
      }
    });

    // From sub-event assignments
    (booking?.subEvents || []).forEach((sub: any) => {
      (sub.staffAssignments || []).forEach((sa: any) => {
        if (sa.user) {
          const prev = map.get(sa.user.id);
          map.set(sa.user.id, {
            id: sa.user.id,
            name: sa.user.name || 'Staff Member',
            role: sa.role,
            phone: sa.user.phone || '',
            expectedGearList: sa.expectedGearList || prev?.expectedGearList || null,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [booking]);

  const gearAllocations = booking?.shootGearAllocations || [];

  // Initialize dialog state when opened
  const handleOpenBuilder = () => {
    setReportingVenue(existingCallSheet?.reportingVenue || booking?.location || '');

    // Default call time: 2 hours before event start date or existing callTime
    if (existingCallSheet?.callTime) {
      const dt = new Date(existingCallSheet.callTime);
      setCallTime(dt.toISOString().slice(0, 16));
    } else if (booking?.startDate) {
      const dt = new Date(booking.startDate);
      setCallTime(dt.toISOString().slice(0, 16));
    } else {
      setCallTime(new Date().toISOString().slice(0, 16));
    }

    setGoogleMapsLink(existingCallSheet?.googleMapsLink || '');
    setDressCode(existingCallSheet?.dressCode || 'All Black Professional');
    setSpecialNotes(existingCallSheet?.specialNotes || '');
    setLeadDirectorId(existingCallSheet?.leadDirectorId || 'none');
    setSelectedSubEventId('all');
    setSelectedCrewUserIds(uniqueCrew.map((c) => c.id));
    setDispatchedUrls([]);
    setDialogOpen(true);
  };

  // Live WhatsApp message preview
  const livePreview = useMemo(() => {
    const shootTitle = booking?.title || 'Wedding Shoot';
    const clientName = `${booking?.customer?.firstName || ''} ${booking?.customer?.lastName || ''}`.trim() || 'Client';
    const clientPhone = booking?.customer?.phone || 'N/A';
    const shootDateStr = formatDate(booking?.startDate, 'dd MMMM yyyy');

    const formattedCallTime = callTime
      ? formatDateTime(new Date(callTime), 'hh:mm a (dd/MM/yyyy)')
      : 'TBD';

    const directorObj = teamMembers.find((m) => m.id === leadDirectorId);

    const crewListFormatted =
      uniqueCrew.length > 0
        ? uniqueCrew
            .map((c) => `  • *${c.role}:* ${c.name} (${c.phone || 'No Phone'})`)
            .join('\n')
        : '  • _No crew assigned yet_';

    const gearListFormatted =
      gearAllocations.length > 0
        ? gearAllocations
            .map((g: any) => {
              const custodian = g.assignedTo?.name ? ` [Custodian: ${g.assignedTo.name}]` : '';
              return `  • *${g.equipment?.name || 'Gear'}* (${g.equipment?.brand || ''} ${g.equipment?.modelNumber || ''})${custodian}`;
            })
            .join('\n')
        : '  • _Standard studio kit_';

    const byogCrew = uniqueCrew.filter((c) => c.expectedGearList && c.expectedGearList.trim());
    const byogFormatted =
      byogCrew.length > 0
        ? byogCrew
            .map((c) => {
              const items = c.expectedGearList!
                .trim()
                .split('\n')
                .map((l) => (l.trim().startsWith('•') || l.trim().startsWith('-') ? `    ${l.trim()}` : `    - ${l.trim()}`))
                .join('\n');
              return `  • *${c.name} (${c.role} - BYOG):*\n${items}`;
            })
            .join('\n')
        : null;

    return `🎬 *SHOOT CALL SHEET & LOGISTICS*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Event:* ${shootTitle} (${booking?.bookingNumber || 'N/A'})
👤 *Client:* ${clientName} (${clientPhone})
📅 *Date:* ${shootDateStr}
⏰ *Exact Call Time:* ${formattedCallTime}
📍 *Reporting Venue:* ${reportingVenue || 'To Be Confirmed'}
🗺️ *GPS Navigation:* ${googleMapsLink || 'Shared upon arrival'}
👔 *Dress Code:* ${dressCode || 'All Black Professional'}
🎬 *Lead Director:* ${directorObj?.name || 'Studio Production Desk'}

👥 *CREW ROSTER:*
${crewListFormatted}
${byogFormatted ? `\n🎒 *REQUIRED GEAR TO BRING (BYOG):*\n${byogFormatted}\n` : ''}
📦 *STUDIO GEAR TO DISPATCH / COLLECT:*
${gearListFormatted}

⚠️ *Notes:* ${specialNotes || 'Arrive 30 mins prior to call time. Ensure dual card backups.'}
━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via Pratima ERP Shoot Logistics_`;
  }, [
    booking,
    callTime,
    reportingVenue,
    googleMapsLink,
    dressCode,
    specialNotes,
    leadDirectorId,
    uniqueCrew,
    gearAllocations,
    teamMembers,
  ]);

  const toggleSelectCrew = (userId: string) => {
    setSelectedCrewUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(livePreview);
    setCopied(true);
    toast.success('Call sheet markdown copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingVenue || !callTime) {
      toast.error('Reporting venue and call time are required');
      return;
    }

    setIsDispatching(true);
    try {
      const res = await generateAndDispatchCallSheetAction({
        bookingId: booking.id,
        subEventId: selectedSubEventId !== 'all' ? selectedSubEventId : null,
        callTime: new Date(callTime).toISOString(),
        reportingVenue: reportingVenue.trim(),
        googleMapsLink: googleMapsLink ? googleMapsLink.trim() : null,
        dressCode: dressCode ? dressCode.trim() : null,
        specialNotes: specialNotes ? specialNotes.trim() : null,
        leadDirectorId: leadDirectorId !== 'none' ? leadDirectorId : null,
        targetCrewUserIds: selectedCrewUserIds,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to dispatch call sheet');
        return;
      }

      setDispatchedUrls(res.data.directWhatsAppUrls || []);
      toast.success(
        `Call sheet generated! Dispatched to ${res.data.dispatchesCount} crew members via WhatsApp audit log.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error dispatching call sheet');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <>
      {/* Bottom Command Bar */}
      <div
        className={cn(
          'p-4 rounded-2xl border border-border/80 bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4',
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">
                {existingCallSheet ? 'Call Sheet Configured' : 'Call Sheet Pending'}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {existingCallSheet
                  ? `Call Time: ${formatDateTime(existingCallSheet.callTime, 'hh:mm a (dd/MM)')}`
                  : 'Configure venue call time, dress code & packing list'}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>{uniqueCrew.length} Crew Ready</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>{gearAllocations.length} Gear Items Ready</span>
            </span>
            {dispatchLogs.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{dispatchLogs.length} Dispatched</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleOpenBuilder}
          className="font-bold text-xs gap-2 px-5 rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Call Sheet & WhatsApp Dispatch</span>
        </Button>
      </div>

      {/* Full Builder & Dispatch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <span>Shoot Call Sheet & WhatsApp Dispatch</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate formatted call sheets with venue GPS, crew rosters, and gear checklists.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDispatchSubmit} className="space-y-4 py-2 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Form Inputs */}
              <div className="space-y-3.5 text-xs">
                {/* Reporting Venue */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Reporting Venue / Location *</Label>
                  <Input
                    required
                    value={reportingVenue}
                    onChange={(e) => setReportingVenue(e.target.value)}
                    placeholder="e.g., Grand Hyatt Ball Room, Santacruz East, Mumbai"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Call Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Exact Call Time *</Label>
                    <Input
                      required
                      type="datetime-local"
                      value={callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Lead Shoot Director</Label>
                    <Select value={leadDirectorId} onValueChange={(val) => setLeadDirectorId(val || 'none')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select director..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-52">
                        <SelectItem value="none" className="text-xs">
                          Studio Production Desk
                        </SelectItem>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.name} ({m.designation || 'Director'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* GPS Navigation Link */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Google Maps GPS Navigation Link</Label>
                  <Input
                    type="url"
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* Dress Code & Sub-Event */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Crew Dress Code</Label>
                    <Input
                      value={dressCode}
                      onChange={(e) => setDressCode(e.target.value)}
                      placeholder="e.g., All Black Professional"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Target Sub-Event</Label>
                    <Select value={selectedSubEventId} onValueChange={(val) => setSelectedSubEventId(val || 'all')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Functions" />
                      </SelectTrigger>
                      <SelectContent className="max-h-52">
                        <SelectItem value="all" className="text-xs">
                          Overall Event (All Functions)
                        </SelectItem>
                        {subEvents.map((s: any) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Special Instructions & Guidelines</Label>
                  <Textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="e.g., Drone flights allowed after 07:00 PM. Dual card recording mandatory."
                    className="text-xs resize-none"
                  />
                </div>

                {/* Target Recipients Checklist */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Select WhatsApp Recipients</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-xl p-2 space-y-1 bg-muted/20">
                    {uniqueCrew.length === 0 ? (
                      <div className="text-center py-2 text-xs text-muted-foreground italic">
                        No assigned crew members found.
                      </div>
                    ) : (
                      uniqueCrew.map((c) => {
                        const isChecked = selectedCrewUserIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center justify-between p-1 rounded hover:bg-muted/60 cursor-pointer text-xs"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectCrew(c.id)}
                                className="rounded text-primary w-3.5 h-3.5"
                              />
                              <span className="font-medium text-foreground">{c.name}</span>
                              <span className="text-muted-foreground text-[10px]">({c.role})</span>
                              {c.expectedGearList && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-300 py-0 px-1 font-normal"
                                >
                                  BYOG
                                </Badge>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {c.phone || 'No Phone'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live WhatsApp Markdown Preview */}
              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live WhatsApp Call Sheet Preview</span>
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPreview}
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>

                <div className="flex-1 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed p-4 rounded-xl border border-border/80 overflow-y-auto max-h-[420px] whitespace-pre-wrap select-all shadow-inner">
                  {livePreview}
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Links Box (Post-Dispatch) */}
            {dispatchedUrls.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Direct WhatsApp Click-to-Chat Links Ready:</span>
                  </span>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px]">
                    {dispatchedUrls.length} Dispatched
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {dispatchedUrls.map((item) => (
                    <a
                      key={item.userId}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send to {item.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isDispatching || !reportingVenue || !callTime}
                className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isDispatching ? 'Dispatching...' : 'Dispatch Call Sheet via WhatsApp'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
