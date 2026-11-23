'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Trash2,
  Edit2,
  Wrench,
  XCircle,
  Building2,
  Loader2,
  Send,
  CalendarDays,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VehicleModal } from './VehicleModal';
import {
  getVehiclesAction,
  getVehicleStatsAction,
  deleteVehicleAction,
  toggleVehicleStatusAction,
  removeVehicleFromSubEventAction,
  getUpcomingVehicleDispatchesAction,
} from '@/actions/vehicle.actions';
import { toast } from 'sonner';
import { AssetStatus } from '@prisma/client';
import { formatDate } from '@/lib/date';

export interface VehicleFleetDashboardProps {
  initialVehicles: any[];
  initialStats: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
  };
  initialDispatches: any[];
  branches: { id: string; name: string; code?: string | null }[];
  isAllBranches: boolean;
  activeBranchName: string;
}

export function VehicleFleetDashboard({
  initialVehicles,
  initialStats,
  initialDispatches,
  branches,
  isAllBranches,
  activeBranchName,
}: VehicleFleetDashboardProps) {
  const router = useRouter();

  const [vehicles, setVehicles] = React.useState<any[]>(initialVehicles);
  const [stats, setStats] = React.useState(initialStats);
  const [dispatches, setDispatches] = React.useState<any[]>(initialDispatches);

  const [activeTab, setActiveTab] = React.useState<'fleet' | 'schedule'>('fleet');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [branchFilter, setBranchFilter] = React.useState<string>('ALL');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [vehRes, statsRes, dispRes] = await Promise.all([
        getVehiclesAction(branchFilter !== 'ALL' ? branchFilter : undefined),
        getVehicleStatsAction(),
        getUpcomingVehicleDispatchesAction(),
      ]);

      if (vehRes.success && vehRes.data) {
        setVehicles(vehRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (dispRes.success && dispRes.data) {
        setDispatches(dispRes.data);
      }
    } catch (err: any) {
      toast.error('Failed to refresh fleet data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (vehicle: any) => {
    if (!confirm(`Are you sure you want to retire and remove vehicle "${vehicle.plateNumber}" (${vehicle.makeModel}) from the active fleet?`)) {
      return;
    }

    setActionLoadingId(vehicle.id);
    try {
      const res = await deleteVehicleAction(vehicle.id);
      if (res.success) {
        toast.success(res.message);
        refreshData();
      } else {
        toast.error(res.error || 'Failed to remove vehicle');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusToggle = async (vehicleId: string, currentStatus: AssetStatus) => {
    const nextStatus: AssetStatus =
      currentStatus === AssetStatus.AVAILABLE
        ? AssetStatus.MAINTENANCE
        : currentStatus === AssetStatus.MAINTENANCE
        ? AssetStatus.AVAILABLE
        : AssetStatus.AVAILABLE;

    setActionLoadingId(vehicleId);
    try {
      const res = await toggleVehicleStatusAction(vehicleId, nextStatus);
      if (res.success) {
        toast.success(`Vehicle status changed to ${nextStatus}`);
        refreshData();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelDispatch = async (dispatchId: string, plateNumber: string) => {
    if (!confirm(`Deallocate vehicle "${plateNumber}" from this shoot?`)) {
      return;
    }

    setActionLoadingId(dispatchId);
    try {
      const res = await removeVehicleFromSubEventAction(dispatchId);
      if (res.success) {
        toast.success(res.message);
        refreshData();
      } else {
        toast.error(res.error || 'Failed to deallocate vehicle');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered vehicles list
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.driverName && v.driverName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || v.branchId === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <span>Operations</span>
            <span>/</span>
            <span>Vehicle Fleet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-foreground tracking-tight">
            Vehicle Fleet &amp; Transport Hub
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Production vans, SUVs, and equipment transport vehicles for on-site shoot dispatches
            {isAllBranches ? ' (Consolidated across all studio branches)' : ` for ${activeBranchName}`}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="text-xs h-9 gap-1.5"
            title="Refresh fleet records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedVehicle(null);
              setModalOpen(true);
            }}
            className="text-xs h-9 gap-1.5 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlights Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Fleet
            </span>
            <Car className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-heading text-foreground">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Registered vehicles</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ready to Dispatch
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {stats.available}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Available for reservation</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned / In-Field
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
              {stats.inUse}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active shoot duties</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Maintenance
            </span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              {stats.maintenance}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Servicing &amp; repairs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger
              value="fleet"
              className="data-[state=active]:bg-background text-xs py-2 px-3.5 rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Fleet Registry ({vehicles.length})</span>
            </TabsTrigger>

            <TabsTrigger
              value="schedule"
              className="data-[state=active]:bg-background text-xs py-2 px-3.5 rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Upcoming Shoot Schedule ({dispatches.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: FLEET REGISTRY */}
        <TabsContent value="fleet" className="space-y-4 focus-visible:outline-none">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by plate number, make/model, or driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Branch filter if in All Branches mode */}
              {isAllBranches && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="text-xs h-9 px-2.5 rounded-lg border bg-background text-foreground"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Status pills */}
              <div className="flex items-center bg-muted/60 p-1 rounded-lg gap-1 border">
                {(['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === st
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicles Table Card */}
          <Card className="shadow-2xs">
            <CardContent className="p-0">
              {filteredVehicles.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                    <Car className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-base text-foreground">No vehicles found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'No fleet records match your active search and filter criteria.'
                      : 'Add your first production van or SUV to enable automatic collision-free shoot transport dispatch.'}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setModalOpen(true);
                    }}
                    className="text-xs font-semibold gap-1.5 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register First Vehicle</span>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Plate Number</th>
                        <th className="py-3 px-4">Vehicle Details</th>
                        <th className="py-3 px-4">Stationed Branch</th>
                        <th className="py-3 px-4">Default Driver</th>
                        <th className="py-3 px-4">Status &amp; Availability</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredVehicles.map((vehicle) => {
                        const isActionLoading = actionLoadingId === vehicle.id;

                        let statusBadgeClass =
                          'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
                        if (vehicle.status === AssetStatus.IN_USE) {
                          statusBadgeClass =
                            'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10';
                        } else if (vehicle.status === AssetStatus.MAINTENANCE) {
                          statusBadgeClass =
                            'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10';
                        } else if (vehicle.status === AssetStatus.RETIRED) {
                          statusBadgeClass =
                            'border-slate-500/30 text-slate-500 bg-slate-500/10';
                        }

                        return (
                          <tr
                            key={vehicle.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-muted px-2 py-1 rounded border border-border/80 text-foreground">
                                  {vehicle.plateNumber}
                                </span>
                                {vehicle.isDispatchedToday && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  >
                                    In-Field Today
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-foreground">
                                {vehicle.makeModel}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                                  {vehicle.type || 'VAN'}
                                </Badge>
                                <span>• {vehicle.capacity || 5} Seater</span>
                                <span>• {vehicle.fuelType || 'DIESEL'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{vehicle.branch?.name || 'Main Branch'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {vehicle.driverName ? (
                                <div>
                                  <div className="font-medium text-foreground">
                                    {vehicle.driverName}
                                  </div>
                                  {vehicle.driverPhone && (
                                    <a
                                      href={`tel:${vehicle.driverPhone}`}
                                      className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{vehicle.driverPhone}</span>
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic text-[11px]">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold px-2 py-0.5 ${statusBadgeClass}`}
                                >
                                  {vehicle.status}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(vehicle.id, vehicle.status)}
                                  disabled={isActionLoading}
                                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                  title="Toggle between Available and Maintenance"
                                >
                                  {vehicle.status === AssetStatus.AVAILABLE
                                    ? 'Set Maintenance'
                                    : 'Set Available'}
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedVehicle(vehicle);
                                    setModalOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit vehicle details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isActionLoading}
                                  onClick={() => handleDelete(vehicle)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  title="Retire/delete vehicle"
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: UPCOMING SHOOT SCHEDULE */}
        <TabsContent value="schedule" className="space-y-4 focus-visible:outline-none">
          <Card className="shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>Confirmed Shoot Vehicle Reservations</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time transport schedule across all wedding events and multi-day shoots.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dispatches.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60 mb-1" />
                  <p className="text-xs font-semibold text-foreground">No upcoming vehicle dispatches</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    When you assign a fleet vehicle to a shoot in the Booking Command Center, it will appear here in chronological order.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Shoot Date &amp; Function</th>
                        <th className="py-3 px-4">Booking Title &amp; Client</th>
                        <th className="py-3 px-4">Assigned Vehicle</th>
                        <th className="py-3 px-4">Driver On-Duty</th>
                        <th className="py-3 px-4">Destination / Venue</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {dispatches.map((disp: any) => {
                        const isCancelling = actionLoadingId === disp.id;
                        const clientName = [
                          disp.eventBooking?.customer?.firstName,
                          disp.eventBooking?.customer?.lastName,
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Client';

                        return (
                          <tr key={disp.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-foreground">
                                {disp.subEvent?.name || 'Shoot Function'}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {formatDate(disp.subEvent?.eventDate || disp.startTime, 'dd MMM yyyy')}
                                </span>
                                {disp.subEvent?.startTime && (
                                  <span>
                                    ({disp.subEvent.startTime} - {disp.subEvent.endTime})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-foreground">
                                {disp.eventBooking?.title || 'Event Booking'}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                #{disp.eventBooking?.bookingNumber} • {clientName}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border text-foreground">
                                  {disp.vehicle?.plateNumber}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {disp.vehicle?.makeModel}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-foreground">
                                {disp.driverName || disp.vehicle?.driverName || 'Studio Driver'}
                              </div>
                              {(disp.driverPhone || disp.vehicle?.driverPhone) && (
                                <div className="text-[11px] text-muted-foreground">
                                  {disp.driverPhone || disp.vehicle?.driverPhone}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-muted-foreground">
                              {disp.subEvent?.locationVenue ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {disp.subEvent.locationVenue}
                                  </span>
                                </div>
                              ) : (
                                <span className="italic text-[11px]">Unspecified</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isCancelling}
                                onClick={() => handleCancelDispatch(disp.id, disp.vehicle?.plateNumber)}
                                className="text-xs h-7 px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                                title="Cancel this vehicle dispatch"
                              >
                                {isCancelling ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <span>Deallocate</span>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Vehicle Modal */}
      <VehicleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vehicle={selectedVehicle}
        branches={branches}
        onSuccess={refreshData}
      />
    </div>
  );
}
