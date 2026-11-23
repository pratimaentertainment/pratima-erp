'use client';

import React from 'react';
import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Wand2,
  BookOpen,
  PackageCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';

export type JourneyStatusType =
  | 'ENQUIRY'
  | 'BOOKED'
  | 'SHOOT_COMPLETED'
  | 'SELECTION_PENDING'
  | 'EDITING_IN_PROGRESS'
  | 'ALBUM_PRINTING'
  | 'DELIVERED';

export interface JourneyTrackerProps {
  status: JourneyStatusType | string;
  bookingTitle?: string;
  eventDate?: Date | string | null;
  location?: string | null;
  className?: string;
}

interface StepDefinition {
  key: JourneyStatusType;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  clientHint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const JOURNEY_STEPS: StepDefinition[] = [
  {
    key: 'BOOKED',
    title: 'Booking Confirmed',
    shortTitle: 'Booking',
    subtitle: 'Dates locked & team assigned',
    description: 'Your event dates are locked into our calendar and the lead photography team has been assigned.',
    clientHint: 'Our team is preparing your moodboard and customized shot list.',
    icon: CalendarCheck,
  },
  {
    key: 'SHOOT_COMPLETED',
    title: 'Shoot Completed',
    shortTitle: 'Shoot Done',
    subtitle: 'Footage safely secured',
    description: 'Your shoot has wrapped! All memory cards are ingested, verified, and safely backed up to cloud storage.',
    clientHint: 'Curation and initial photo indexing are in progress.',
    icon: Camera,
  },
  {
    key: 'SELECTION_PENDING',
    title: 'Selection Pending',
    shortTitle: 'Selection',
    subtitle: 'Choose your favorites',
    description: 'Your digital proofing gallery is open. Pick your favorite photos for print and album design.',
    clientHint: 'Action needed: Review and submit your photo selections.',
    icon: ImageIcon,
  },
  {
    key: 'EDITING_IN_PROGRESS',
    title: 'Editing in Progress',
    shortTitle: 'Editing',
    subtitle: 'Color grading & retouching',
    description: 'Our colorists and editors are meticulously retouching skin tones, light balance, and cinematic style.',
    clientHint: 'Album layout and page composition are currently underway.',
    icon: Wand2,
  },
  {
    key: 'ALBUM_PRINTING',
    title: 'Album Printing',
    shortTitle: 'Printing',
    subtitle: 'Lab printing & bindery',
    description: 'Your approved album layout has been sent to our master print lab for archival paper printing and handcrafted leather binding.',
    clientHint: 'Quality inspection and packaging will be completed shortly.',
    icon: BookOpen,
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    shortTitle: 'Delivered',
    subtitle: 'All assets handed over',
    description: 'Congratulations! All high-resolution master galleries, films, and printed albums have been officially delivered.',
    clientHint: 'You have lifetime access to your digital galleries and archives.',
    icon: PackageCheck,
  },
];

const STATUS_PROGRESSION: Record<string, number> = {
  ENQUIRY: 0,
  BOOKED: 0,
  SHOOT_COMPLETED: 1,
  SELECTION_PENDING: 2,
  EDITING_IN_PROGRESS: 3,
  ALBUM_PRINTING: 4,
  DELIVERED: 5,
};

export function JourneyTracker({
  status,
  bookingTitle,
  eventDate,
  location,
  className,
}: JourneyTrackerProps) {
  const normalizedStatus = (status || 'BOOKED').toUpperCase();
  const activeIndex = STATUS_PROGRESSION[normalizedStatus] ?? 0;
  const isAllDelivered = normalizedStatus === 'DELIVERED';

  // Overall percentage completed
  const progressPercentage = isAllDelivered
    ? 100
    : Math.round(((activeIndex + 0.5) / JOURNEY_STEPS.length) * 100);

  const currentStep = JOURNEY_STEPS[activeIndex] || JOURNEY_STEPS[0];

  const formattedEventDate = React.useMemo(() => {
    if (!eventDate) return null;
    if (eventDate instanceof Date) {
      return formatDate(eventDate, 'dd MMM yyyy');
    }
    if (typeof eventDate === 'string') {
      if (eventDate.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(eventDate)) {
        return formatDate(eventDate, 'dd MMM yyyy');
      }
      return eventDate;
    }
    return String(eventDate);
  }, [eventDate]);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card/70 p-6 md:p-8 shadow-xs backdrop-blur-xs transition-all',
        className
      )}
    >
      {/* Top Header Summary */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Event Journey Tracker
            </h2>
            <Badge
              variant="outline"
              className={cn(
                'font-medium text-xs px-2.5 py-0.5 rounded-full capitalize',
                isAllDelivered
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-primary/30 bg-primary/10 text-primary'
              )}
            >
              {isAllDelivered ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Journey Completed
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Step {activeIndex + 1} of {JOURNEY_STEPS.length}: {currentStep.shortTitle}
                </span>
              )}
            </Badge>
          </div>
          {(bookingTitle || formattedEventDate || location) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              {bookingTitle && <span className="font-medium text-foreground/80">{bookingTitle}</span>}
              {formattedEventDate && (
                <>
                  <span>•</span>
                  <span>{formattedEventDate}</span>
                </>
              )}
              {location && (
                <>
                  <span>•</span>
                  <span>{location}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Journey Progress</div>
            <div className="text-sm font-semibold text-foreground">{progressPercentage}%</div>
          </div>
          <div className="w-24 sm:w-28 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-700 ease-out rounded-full',
                isAllDelivered ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Stepper View (Desktop & Tablet) */}
      <div className="pt-8 pb-4">
        {/* Step Items Row */}
        <div className="relative">
          {/* Connector Line Track */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted hidden md:block" aria-hidden="true">
            <div
              className={cn(
                'h-full transition-all duration-700 ease-out',
                isAllDelivered ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{
                width: isAllDelivered
                  ? '100%'
                  : `${(activeIndex / (JOURNEY_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-2 relative z-10">
            {JOURNEY_STEPS.map((step, idx) => {
              const isCompleted = isAllDelivered || idx < activeIndex;
              const isCurrent = !isAllDelivered && idx === activeIndex;
              const isUpcoming = !isAllDelivered && idx > activeIndex;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex flex-col items-center text-center group transition-all',
                    isCurrent && 'scale-102'
                  )}
                >
                  {/* Step Icon / Circle */}
                  <div className="relative mb-3 flex items-center justify-center">
                    {/* Active Pulsing Ring Effect */}
                    {isCurrent && (
                      <div className="absolute -inset-1.5 rounded-full bg-primary/25 animate-ping opacity-60 pointer-events-none" />
                    )}

                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all shadow-xs',
                        isCompleted &&
                          'bg-primary text-primary-foreground ring-4 ring-primary/10 shadow-primary/20',
                        isCurrent &&
                          'bg-primary text-primary-foreground ring-4 ring-primary/25 shadow-md shadow-primary/30',
                        isUpcoming &&
                          'bg-muted/80 text-muted-foreground/70 border border-border/80'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <StepIcon
                          className={cn(
                            'w-5 h-5',
                            isCurrent ? 'text-primary-foreground animate-pulse' : 'text-muted-foreground/80'
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* Step Title & Subtitle */}
                  <div className="w-full px-1">
                    <p
                      className={cn(
                        'text-xs md:text-sm font-semibold tracking-tight transition-colors line-clamp-1',
                        isCompleted && 'text-foreground font-medium',
                        isCurrent && 'text-primary font-bold',
                        isUpcoming && 'text-muted-foreground/70'
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="hidden md:block text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                      {step.subtitle}
                    </p>
                  </div>

                  {/* Current Active Badge */}
                  {isCurrent && (
                    <span className="mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Active Stage
                    </span>
                  )}
                  {isCompleted && (
                    <span className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                      ✓ Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Milestone Highlight Card */}
      <div
        className={cn(
          'mt-6 rounded-xl p-4 md:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
          isAllDelivered
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-primary/5 border-primary/20'
        )}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAllDelivered ? 'Final Milestone' : 'Current Stage Details'}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm font-bold text-foreground">
              {currentStep.title}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/80 px-3 py-2 rounded-lg border border-border/60">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span>{currentStep.clientHint}</span>
        </div>
      </div>
    </div>
  );
}
