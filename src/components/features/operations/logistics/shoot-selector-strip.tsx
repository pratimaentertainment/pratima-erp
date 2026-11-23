'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Package,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

export interface ShootSummaryItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  location?: string | null;
  customer?: {
    id: string;
    customerCode?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
  subEvents?: Array<{
    id: string;
    name: string;
    eventDate: string | Date;
    staffAssignments?: any[];
    shootGearAllocations?: any[];
  }>;
  assignments?: any[];
  shootGearAllocations?: any[];
  callSheets?: any[];
}

export interface ShootSelectorStripProps {
  shoots: ShootSummaryItem[];
  selectedShootId: string | null;
  onSelectShoot: (shootId: string) => void;
  className?: string;
}

export function ShootSelectorStrip({
  shoots,
  selectedShootId,
  onSelectShoot,
  className,
}: ShootSelectorStripProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShoots = useMemo(() => {
    if (!searchQuery.trim()) return shoots;
    const q = searchQuery.toLowerCase().trim();
    return shoots.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(q);
      const codeMatch = s.bookingNumber?.toLowerCase().includes(q);
      const locMatch = s.location?.toLowerCase().includes(q);
      const clientName = `${s.customer?.firstName || ''} ${s.customer?.lastName || ''}`.toLowerCase();
      return titleMatch || codeMatch || locMatch || clientName.includes(q);
    });
  }, [shoots, searchQuery]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search & Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Upcoming Shoots & Productions
          </span>
          <Badge variant="secondary" className="text-xs font-semibold px-2 py-0">
            {shoots.length} Active
          </Badge>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shoot, code, client, venue..."
            className="h-8 pl-8 text-xs bg-card/60"
          />
        </div>
      </div>

      {/* Shoots Horizontal Strip / Responsive Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {filteredShoots.length === 0 ? (
          <div className="w-full text-center py-6 border border-dashed rounded-xl bg-muted/20 text-xs text-muted-foreground">
            No matching shoots found.
          </div>
        ) : (
          filteredShoots.map((shoot) => {
            const isSelected = shoot.id === selectedShootId;

            // Compute readiness metrics
            const crewCount =
              (shoot.assignments?.length || 0) +
              (shoot.subEvents?.reduce((acc, sub) => acc + (sub.staffAssignments?.length || 0), 0) || 0);

            const gearCount = shoot.shootGearAllocations?.length || 0;
            const hasCallSheet = (shoot.callSheets?.length || 0) > 0;

            const isFullyAllocated = crewCount > 0 && gearCount > 0 && hasCallSheet;
            const isPartiallyAllocated = crewCount > 0 || gearCount > 0;

            const clientName =
              `${shoot.customer?.firstName || ''} ${shoot.customer?.lastName || ''}`.trim() ||
              'Client';

            const shootDateStr = formatDate(shoot.startDate, 'dd MMM yyyy');

            return (
              <button
                key={shoot.id}
                type="button"
                onClick={() => onSelectShoot(shoot.id)}
                className={cn(
                  'shrink-0 w-80 text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2.5 relative group',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-card shadow-md'
                    : 'border-border/70 bg-card/70 hover:border-border hover:bg-card shadow-2xs'
                )}
              >
                {/* Header Code & Date */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-primary">
                    {shoot.bookingNumber}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{shootDateStr}</span>
                  </span>
                </div>

                {/* Shoot Title & Client */}
                <div>
                  <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {shoot.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {clientName} • {shoot.location || 'Venue TBD'}
                  </p>
                </div>

                {/* Allocation Status Pills */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-[11px]">
                  {/* Crew pill */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px]',
                      crewCount > 0
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    <Users className="w-2.5 h-2.5" />
                    <span>{crewCount > 0 ? `${crewCount} Crew` : 'No Crew'}</span>
                  </span>

                  {/* Gear pill */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px]',
                      gearCount > 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    <Package className="w-2.5 h-2.5" />
                    <span>{gearCount > 0 ? `${gearCount} Gear` : 'No Gear'}</span>
                  </span>

                  {/* Call sheet pill */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ml-auto',
                      hasCallSheet
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{hasCallSheet ? 'Ready' : 'Draft'}</span>
                  </span>
                </div>

                {/* Selected Indicator Pill */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
