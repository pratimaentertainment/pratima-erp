'use client';

import * as React from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Users,
  Clock,
  MapPin,
  List,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarEventDto } from '@/services/calendar/calendar.types';
import { EventDetailSheet } from './event-detail-sheet';
import { getCalendarEventsAction } from '@/actions/calendar.actions';
import { toast } from 'sonner';

interface EnterpriseCalendarProps {
  initialEvents: CalendarEventDto[];
  initialDate?: string;
}

type ViewMode = 'month' | 'agenda';

export function EnterpriseCalendar({ initialEvents, initialDate }: EnterpriseCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(
    initialDate ? new Date(initialDate) : new Date()
  );
  const [viewMode, setViewMode] = React.useState<ViewMode>('month');
  const [events, setEvents] = React.useState<CalendarEventDto[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEventDto | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Load events for a new month
  const fetchMonthEvents = async (targetDate: Date) => {
    setIsLoading(true);
    try {
      const start = startOfWeek(startOfMonth(targetDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(targetDate), { weekStartsOn: 0 });

      const res = await getCalendarEventsAction(start.toISOString(), end.toISOString());
      if (res.success && res.data) {
        setEvents(res.data);
      } else if (!res.success) {
        toast.error(res.error || 'Failed to load events for this month');
      }
    } catch {
      toast.error('Error fetching calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    fetchMonthEvents(newDate);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    fetchMonthEvents(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    fetchMonthEvents(today);
  };

  const handleEventClick = (event: CalendarEventDto) => {
    setSelectedEvent(event);
    setIsSheetOpen(true);
  };

  // Filter events based on search and status
  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      // Status filter
      if (statusFilter !== 'ALL' && event.status?.toUpperCase() !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesSubEvent = event.subEventName?.toLowerCase().includes(query);
        const matchesBooking = event.bookingTitle?.toLowerCase().includes(query);
        const matchesNumber = event.bookingNumber?.toLowerCase().includes(query);
        const matchesVenue = event.venue?.toLowerCase().includes(query);
        const matchesCustomer = event.customer?.name.toLowerCase().includes(query);
        const matchesCrew = event.assignedCrew.some((c) => c.name.toLowerCase().includes(query));

        return (
          matchesTitle ||
          matchesSubEvent ||
          matchesBooking ||
          matchesNumber ||
          matchesVenue ||
          matchesCustomer ||
          matchesCrew
        );
      }

      return true;
    });
  }, [events, statusFilter, searchQuery]);

  // Aggregate monthly metrics
  const metrics = React.useMemo(() => {
    const monthEvents = filteredEvents.filter((e) =>
      isSameMonth(new Date(e.start), currentDate)
    );
    const confirmed = monthEvents.filter((e) => e.status?.toUpperCase() === 'CONFIRMED').length;
    const tentative = monthEvents.filter((e) => e.status?.toUpperCase() === 'TENTATIVE').length;
    const crewCount = monthEvents.reduce((acc, curr) => acc + curr.assignedCrew.length, 0);

    return {
      total: monthEvents.length,
      confirmed,
      tentative,
      crewCount,
    };
  }, [filteredEvents, currentDate]);

  // Calendar Grid Days
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Group events by day for Month View
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    for (const event of filteredEvents) {
      const key = format(new Date(event.start), 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    }
    return map;
  }, [filteredEvents]);

  // Group events for Agenda View (chronological)
  const agendaEvents = React.useMemo(() => {
    const sorted = [...filteredEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const groups: { date: Date; events: CalendarEventDto[] }[] = [];
    let currentDateKey = '';

    for (const ev of sorted) {
      const dateKey = format(new Date(ev.start), 'yyyy-MM-dd');
      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
        groups.push({
          date: new Date(ev.start),
          events: [ev],
        });
      } else {
        groups[groups.length - 1].events.push(ev);
      }
    }

    return groups;
  }, [filteredEvents]);

  // Visual status styling
  const getEventStyle = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-500/20';
      case 'TENTATIVE':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 hover:bg-amber-500/20';
      case 'COMPLETED':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-950 dark:text-blue-100 hover:bg-blue-500/20';
      case 'CANCELLED':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100 hover:bg-rose-500/20 opacity-60';
      default:
        return 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20';
    }
  };

  const getStatusDot = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-emerald-500';
      case 'TENTATIVE':
        return 'bg-amber-500';
      case 'COMPLETED':
        return 'bg-blue-500';
      case 'CANCELLED':
        return 'bg-rose-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Title, Metrics & View Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Operations Calendar
            </h1>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-tenant schedule for shoots, sub-events, and crew allocations.
          </p>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{metrics.total}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Confirmed:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.confirmed}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Tentative:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{metrics.tentative}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Dispatched:</span>
            <span className="font-bold text-foreground">{metrics.crewCount}</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Navigation, Search, Filter & View Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
              disabled={isLoading}
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-8 px-2.5 text-xs font-medium"
              disabled={isLoading}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
              disabled={isLoading}
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-bold text-foreground ml-2 min-w-[170px]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        {/* Filter and View Controls */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Search Box */}
          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search event, crew, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="TENTATIVE">Tentative</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-background p-0.5 shrink-0">
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Month</span>
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <List className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </Button>
          </div>
        </div>
      </div>

      {/* VIEW: Month Grid */}
      {viewMode === 'month' && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-semibold text-muted-foreground py-2.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] divide-x divide-y border-b">
            {calendarDays.map((day, i) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={i}
                  className={`min-h-[120px] p-2 transition-colors flex flex-col justify-between ${
                    !isCurrentMonth ? 'bg-muted/10 text-muted-foreground/60' : 'bg-card'
                  } ${isCurrentDay ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                >
                  {/* Date Header in Cell */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center h-6 w-6 rounded-full ${
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  {/* Day Event Chips */}
                  <div className="space-y-1.5 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className={`w-full text-left p-1.5 rounded-lg border text-xs transition-all flex flex-col gap-1 shadow-2xs cursor-pointer ${getEventStyle(
                          event.status
                        )}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate leading-tight">
                            {event.subEventName || event.title}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDot(event.status)}`} />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          {event.startTimeString && (
                            <span className="truncate">{event.startTimeString}</span>
                          )}

                          {/* Crew Count Pill */}
                          {event.assignedCrew.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-background/60 font-medium">
                              <Users className="h-2.5 w-2.5" />
                              {event.assignedCrew.length}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Overflow Badge */}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleEventClick(dayEvents[3])}
                        className="w-full text-center text-[10px] font-medium text-primary hover:underline py-0.5"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: Agenda (Chronological List) */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {agendaEvents.length > 0 ? (
            agendaEvents.map((group, idx) => (
              <div key={idx} className="space-y-2.5">
                {/* Date Group Heading */}
                <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 bg-background/95 backdrop-blur-xs border-b">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {format(group.date, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  {isToday(group.date) && (
                    <Badge variant="outline" className="text-[10px] border-primary text-primary font-bold">
                      TODAY
                    </Badge>
                  )}
                </div>

                {/* Event Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`h-2 w-2 rounded-full ${getStatusDot(event.status)}`} />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {event.status || 'Active'}
                            </span>
                            {event.bookingNumber && (
                              <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {event.bookingNumber}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-base text-foreground leading-snug">
                            {event.subEventName || event.title}
                          </h4>
                          {event.bookingTitle && event.bookingTitle !== event.subEventName && (
                            <p className="text-xs text-muted-foreground">{event.bookingTitle}</p>
                          )}
                        </div>

                        {event.startTimeString && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg shrink-0">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>{event.startTimeString}</span>
                          </div>
                        )}
                      </div>

                      {/* Location & Client Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{event.venue || event.location || 'No venue'}</span>
                        </div>

                        {event.customer && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium text-foreground">
                              {event.customer.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Crew Avatars */}
                      {event.assignedCrew.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t text-xs">
                          <span className="text-muted-foreground text-[11px]">Crew Assigned:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {event.assignedCrew.map((c) => (
                              <Badge key={c.id} variant="secondary" className="text-[10px] font-normal py-0">
                                {c.name} ({c.role.replace(/_/g, ' ')})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center rounded-xl border border-dashed bg-muted/10 space-y-2">
              <CalendarDays className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <h4 className="font-semibold text-sm">No events found</h4>
              <p className="text-xs text-muted-foreground">
                No events match your current filter criteria or date range.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Slide-out Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
