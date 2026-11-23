'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ClipboardList,
  FileText,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CalendarEventDto } from '@/services/calendar/calendar.types';

interface EventDetailSheetProps {
  event: CalendarEventDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailSheet({ event, isOpen, onClose }: EventDetailSheetProps) {
  if (!event) return null;

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">Confirmed</Badge>;
      case 'TENTATIVE':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">Tentative</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Active'}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formattedDate = event.start
    ? format(new Date(event.start), 'EEEE, MMMM d, yyyy')
    : 'Date not specified';

  const timeDisplay =
    event.startTimeString && event.endTimeString
      ? `${event.startTimeString} – ${event.endTimeString}`
      : event.startTimeString || 'All Day Schedule';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(event.status)}
              {event.bookingNumber && (
                <span className="text-xs font-mono bg-background border px-2 py-0.5 rounded text-muted-foreground">
                  {event.bookingNumber}
                </span>
              )}
            </div>
          </div>
          <SheetTitle className="text-xl font-bold leading-tight text-foreground">
            {event.subEventName || event.title}
          </SheetTitle>
          {event.bookingTitle && event.bookingTitle !== event.subEventName && (
            <SheetDescription className="text-sm font-medium text-muted-foreground mt-0.5">
              Part of {event.bookingTitle}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Schedule & Venue Card */}
          <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Date</p>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Timing</p>
                <p className="text-sm font-medium">{timeDisplay}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Location / Venue</p>
                <p className="text-sm font-medium">{event.venue || event.location || 'Venue not specified'}</p>
              </div>
            </div>
          </div>

          {/* Client Details */}
          {event.customer && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Client Information
              </h4>
              <div className="rounded-xl border bg-card p-4 space-y-2.5">
                <p className="font-semibold text-sm text-foreground">{event.customer.name}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {event.customer.phone && (
                    <a
                      href={`tel:${event.customer.phone}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span>{event.customer.phone}</span>
                    </a>
                  )}
                  {event.customer.email && (
                    <a
                      href={`mailto:${event.customer.email}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{event.customer.email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assigned Crew / Staff */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Assigned Crew ({event.assignedCrew.length})
              </h4>
            </div>

            {event.assignedCrew.length > 0 ? (
              <div className="rounded-xl border divide-y overflow-hidden bg-card">
                {event.assignedCrew.map((staff) => (
                  <div key={staff.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 text-xs border">
                        <AvatarImage src={staff.profileImage || undefined} alt={staff.name} />
                        <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{staff.name}</p>
                        {staff.email && <p className="text-xs text-muted-foreground truncate">{staff.email}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0 font-normal">
                      {staff.role.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground bg-muted/10">
                <AlertCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground/60" />
                No crew members assigned to this session yet.
              </div>
            )}
          </div>

          {/* Workflow Tasks */}
          {event.workflowTasks && event.workflowTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Linked Workflow Tasks ({event.workflowTasks.length})
              </h4>
              <div className="rounded-xl border divide-y overflow-hidden bg-card">
                {event.workflowTasks.map((task) => (
                  <div key={task.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{task.type.replace(/_/g, ' ')}</p>
                      {task.assignedToName && (
                        <p className="text-[11px] text-muted-foreground">Assigned: {task.assignedToName}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-semibold ${
                        task.status === 'COMPLETED'
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes & Instructions
              </h4>
              <div className="rounded-xl border bg-muted/10 p-3 text-xs leading-relaxed text-foreground">
                {event.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 border-t bg-muted/20 flex flex-col gap-2">
          {event.bookingId && (
            <Link
              href={`/operations/bookings/${event.bookingId}`}
              className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2 shadow-xs')}
            >
              <span>Open Full Booking Dossier</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
          <Button variant="outline" onClick={onClose} className="w-full">
            Dismiss
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
