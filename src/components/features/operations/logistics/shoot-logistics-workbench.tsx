'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Package,
  FileText,
  MapPin,
  Clock,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  getShootLogisticsDetailsAction,
  getUpcomingShootsAction,
} from '@/actions/shoot-logistics.actions';

import {
  ShootSelectorStrip,
  ShootSummaryItem,
} from './shoot-selector-strip';
import { CrewAllocationCard } from './crew-allocation-card';
import { GearAllocationCard } from './gear-allocation-card';
import { CallSheetDispatchBar } from './call-sheet-dispatch-bar';

export interface ShootLogisticsWorkbenchProps {
  initialShoots?: any[];
  className?: string;
}

export function ShootLogisticsWorkbench({
  initialShoots = [],
  className,
}: ShootLogisticsWorkbenchProps) {
  const [shoots, setShoots] = useState<any[]>(initialShoots);
  const [selectedShootId, setSelectedShootId] = useState<string | null>(
    initialShoots.length > 0 ? initialShoots[0].id : null
  );

  const [shootDetails, setShootDetails] = useState<{
    booking: any;
    availableEquipment: any[];
    teamMembers: any[];
  } | null>(null);

  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isRefreshing, startTransition] = useTransition();

  // Load detailed shoot context whenever selectedShootId changes
  const loadShootDetails = useCallback(async (shootId: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await getShootLogisticsDetailsAction(shootId);
      if (res.success && res.data) {
        setShootDetails(res.data);
      } else {
        toast.error(res.error || 'Failed to load shoot details');
        setShootDetails(null);
      }
    } catch (err: any) {
      console.error('[LOAD_SHOOT_DETAILS_ERROR]', err);
      toast.error('An unexpected error occurred while loading shoot data');
      setShootDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedShootId) {
      loadShootDetails(selectedShootId);
    } else {
      setShootDetails(null);
    }
  }, [selectedShootId, loadShootDetails]);

  // Refresh entire workbench data (shoots list + current shoot details)
  const handleFullRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        const shootsRes = await getUpcomingShootsAction();
        if (shootsRes.success && shootsRes.data) {
          setShoots(shootsRes.data);
          // If current shoot is still in list, refresh its details; otherwise pick first
          const exists = shootsRes.data.some((s: any) => s.id === selectedShootId);
          if (exists && selectedShootId) {
            await loadShootDetails(selectedShootId);
          } else if (shootsRes.data.length > 0) {
            setSelectedShootId(shootsRes.data[0].id);
          } else {
            setSelectedShootId(null);
            setShootDetails(null);
          }
        }
        toast.success('Workbench data refreshed');
      } catch (err) {
        toast.error('Failed to refresh data');
      }
    });
  }, [selectedShootId, loadShootDetails]);

  // Refresh only the active shoot's logistics (called after crew/gear/callsheet operations)
  const handleCurrentShootRefresh = useCallback(() => {
    if (selectedShootId) {
      loadShootDetails(selectedShootId);
    }
  }, [selectedShootId, loadShootDetails]);

  const booking = shootDetails?.booking;
  const availableEquipment = shootDetails?.availableEquipment || [];
  const teamMembers = shootDetails?.teamMembers || [];

  // Summary counts for current shoot
  const subEventsCount = booking?.subEvents?.length || 0;
  const crewAssignedCount =
    (booking?.assignments?.length || 0) +
    (booking?.subEvents?.reduce((acc: number, s: any) => acc + (s.staffAssignments?.length || 0), 0) || 0);
  const gearAllocatedCount =
    (booking?.shootGearAllocations?.length || 0) +
    (booking?.subEvents?.reduce((acc: number, s: any) => acc + (s.shootGearAllocations?.length || 0), 0) || 0);
  const callSheetsCount = booking?.callSheets?.length || 0;

  return (
    <div className={cn('space-y-6 pb-20', className)}>
      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Shoot Logistics & Allocation
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  Command Center
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Unified master workbench for multi-function crew roster, equipment checkout, and call sheet dispatch.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh Shoots
          </Button>
        </div>
      </div>

      {/* Horizontal Shoot Selector Strip */}
      <ShootSelectorStrip
        shoots={shoots}
        selectedShootId={selectedShootId}
        onSelectShoot={(id) => setSelectedShootId(id)}
      />

      {/* Content Area */}
      {shoots.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center bg-card/40">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Confirmed Shoots Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              There are currently no active or confirmed event bookings requiring crew allocation or gear dispatch.
              Once an inquiry is converted into a confirmed booking, it will automatically populate here.
            </p>
          </div>
        </Card>
      ) : isLoadingDetails ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      ) : !booking ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Select a shoot from the strip above to manage its crew roster and equipment checkout.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Shoot Banner Summary */}
          <div className="bg-gradient-to-r from-card via-card/95 to-primary/5 rounded-xl border border-border/70 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-semibold bg-background">
                    {booking.bookingNumber}
                  </Badge>
                  <h2 className="text-lg font-bold text-foreground">
                    {booking.title}
                  </h2>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-semibold uppercase',
                      booking.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200'
                    )}
                  >
                    {booking.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {booking.customer && (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      Client: {booking.customer.firstName} {booking.customer.lastName}
                      {booking.customer.phone && (
                        <span className="text-muted-foreground font-normal">({booking.customer.phone})</span>
                      )}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </span>
                  {booking.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                      {booking.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Readiness Indicators */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg border text-xs">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-bold">{crewAssignedCount}</span>
                  <span className="text-muted-foreground">Crew</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg border text-xs">
                  <Package className="h-4 w-4 text-indigo-500" />
                  <span className="font-bold">{gearAllocatedCount}</span>
                  <span className="text-muted-foreground">Gear Items</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg border text-xs">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold">{callSheetsCount}</span>
                  <span className="text-muted-foreground">Call Sheets</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master-Detail 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Multi-Function Crew Allocation */}
            <div className="lg:col-span-6 space-y-6">
              <CrewAllocationCard
                booking={booking}
                teamMembers={teamMembers}
                onRefresh={handleCurrentShootRefresh}
              />
            </div>

            {/* Right Column: Equipment Inventory & Conflict Picker */}
            <div className="lg:col-span-6 space-y-6">
              <GearAllocationCard
                booking={booking}
                availableEquipment={availableEquipment}
                teamMembers={teamMembers}
                onRefresh={handleCurrentShootRefresh}
              />
            </div>
          </div>

          {/* Bottom Fixed / Sticky Call Sheet Dispatch Bar */}
          <CallSheetDispatchBar
            booking={booking}
            teamMembers={teamMembers}
            onRefresh={handleCurrentShootRefresh}
          />
        </div>
      )}
    </div>
  );
}
