'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import {
  Boxes,
  Camera,
  Layers,
  Wrench,
  AlertTriangle,
  QrCode,
  Scan,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Disc,
  Radio,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { QrDispatchModal, AllocationItem } from '@/components/features/operations/inventory/qr-dispatch-modal';
import { MaintenanceModal, EquipmentItemForMaintenance, MaintenanceRecordItem } from '@/components/features/operations/inventory/maintenance-modal';
import { AddEquipmentModal } from '@/components/features/operations/inventory/add-equipment-modal';
import { toggleAdvancedInventoryAction } from '@/actions/inventory.actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface EquipmentRecord {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  assetTag?: string | null;
  status: string;
  currentShutterCount: number;
  bufferHours: number;
  purchasePrice?: any;
  purchaseDate?: Date | string | null;
  warrantyExpiryDate?: Date | string | null;
  notes?: string | null;
  branch?: { id: string; name: string } | null;
  maintenances?: Array<{
    id: string;
    vendorName: string;
    issueCategory: string;
    actualCost?: any;
    status: string;
    sentDate: Date | string;
  }>;
  shootAllocations?: Array<{
    id: string;
    status: string;
    eventBooking: {
      id: string;
      title: string;
      bookingNumber: string;
      startDate?: string | null;
    };
    assignedTo?: {
      id: string;
      name: string;
      phone?: string | null;
    } | null;
  }>;
  gearCheckLogs?: Array<{
    id: string;
    checkType: string;
    timestamp: string;
    scannedAssetTag?: string | null;
  }>;
}

interface InventoryClientProps {
  initialEquipments: EquipmentRecord[];
  initialTenant: {
    id: string;
    name: string;
    currency: string;
    isAdvancedInventoryEnabled: boolean;
  };
  initialActiveAllocations: AllocationItem[];
  initialMaintenanceRecords: MaintenanceRecordItem[];
}

export function InventoryClient({
  initialEquipments,
  initialTenant,
  initialActiveAllocations,
  initialMaintenanceRecords,
}: InventoryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(
    initialTenant.isAdvancedInventoryEnabled
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchModalMode, setDispatchModalMode] = useState<'CHECKOUT' | 'CHECKIN'>('CHECKOUT');
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceModalMode, setMaintenanceModalMode] = useState<'SEND' | 'RESOLVE'>('SEND');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedMaintenanceRecord, setSelectedMaintenanceRecord] = useState<MaintenanceRecordItem | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // QR Standee View Modal
  const [viewingQrItem, setViewingQrItem] = useState<EquipmentRecord | null>(null);

  // KPI calculations
  const totalAssets = initialEquipments.length;
  const inUseCount = initialEquipments.filter((e) => e.status === 'IN_USE').length;
  const inMaintenanceCount = initialEquipments.filter((e) => e.status === 'MAINTENANCE').length;
  const highShutterCount = initialEquipments.filter(
    (e) => e.category === 'CAMERA' && e.currentShutterCount >= 100000
  ).length;

  // Toggle Advanced Mode
  const handleToggleAdvancedMode = async (checked: boolean) => {
    setIsAdvancedEnabled(checked);
    try {
      const res = await toggleAdvancedInventoryAction(checked);
      if (res.success) {
        toast.success(res.message);
        startTransition(() => router.refresh());
      } else {
        setIsAdvancedEnabled(!checked);
        toast.error(res.error || 'Failed to update setting');
      }
    } catch {
      setIsAdvancedEnabled(!checked);
      toast.error('Failed to communicate with server');
    }
  };

  // Filtered Equipment
  const filteredEquipments = initialEquipments.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.assetTag && item.assetTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold text-[11px]">
            Available
          </Badge>
        );
      case 'IN_USE':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold text-[11px]">
            In Use on Shoot
          </Badge>
        );
      case 'MAINTENANCE':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold text-[11px]">
            In Maintenance
          </Badge>
        );
      case 'RETIRED':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
            Retired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CAMERA':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'LENS':
        return <Disc className="w-4 h-4 text-purple-500" />;
      case 'DRONE':
        return <Radio className="w-4 h-4 text-cyan-500" />;
      case 'LIGHTING':
        return <Sliders className="w-4 h-4 text-amber-500" />;
      default:
        return <Boxes className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Warehouse Operations & Asset Inventory
              </h1>
              <p className="text-xs text-muted-foreground">
                Enterprise barcode dispatch, digital checklists, camera telemetry, and vendor maintenance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Mode Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Advanced Mode Toggle Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border shadow-2xs">
            <QrCode className="w-4 h-4 text-primary" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Enterprise QR Mode
              </div>
              <div className="text-xs font-semibold text-foreground">
                {isAdvancedEnabled ? 'Strict Verification' : 'Simple Frictionless'}
              </div>
            </div>
            <Switch
              checked={isAdvancedEnabled}
              onCheckedChange={handleToggleAdvancedMode}
              className="ml-1 data-[state=checked]:bg-blue-600"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAllocationId(null);
              setDispatchModalMode('CHECKOUT');
              setIsDispatchModalOpen(true);
            }}
            className="font-semibold text-xs border-primary/30 text-primary hover:bg-primary/5"
          >
            <Scan className="w-3.5 h-3.5 mr-1.5" />
            QR Dispatch / Return
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedEquipmentId(null);
              setMaintenanceModalMode('SEND');
              setIsMaintenanceModalOpen(true);
            }}
            className="font-semibold text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Log Maintenance
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* KPI Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Assets
              </span>
              <div className="text-2xl font-black text-foreground">{totalAssets}</div>
              <p className="text-[10px] text-muted-foreground">Active studio hardware</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                In Field / Shoot
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {inUseCount}
              </div>
              <p className="text-[10px] text-muted-foreground">Dispatched to crew</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                In Maintenance
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {inMaintenanceCount}
              </div>
              <p className="text-[10px] text-muted-foreground">Vendor repairs & service</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                High Shutter Wear
              </span>
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                {highShutterCount}
              </div>
              <p className="text-[10px] text-muted-foreground">&gt;100k shutter clicks</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="registry" className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="registry" className="text-xs font-semibold px-4 py-1.5">
            <Boxes className="w-3.5 h-3.5 mr-1.5" />
            Asset Registry ({initialEquipments.length})
          </TabsTrigger>
          <TabsTrigger value="allocations" className="text-xs font-semibold px-4 py-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
            Shoot Allocations ({initialActiveAllocations.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs font-semibold px-4 py-1.5">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Maintenance & Repairs ({initialMaintenanceRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ASSET REGISTRY */}
        <TabsContent value="registry" className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, brand, serial #, asset tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring h-8"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                <option value="CAMERA">Cameras</option>
                <option value="LENS">Lenses</option>
                <option value="DRONE">Drones</option>
                <option value="LIGHTING">Lighting</option>
                <option value="AUDIO">Audio</option>
                <option value="ACCESSORY">Accessories</option>
              </select>

              <select
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring h-8"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Asset Tag / QR</th>
                    <th className="py-3 px-4">Equipment & Model</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Shutter Count</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEquipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No equipment found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEquipments.map((item) => {
                      const isHighWear = item.category === 'CAMERA' && item.currentShutterCount >= 100000;
                      const activeAlloc = item.shootAllocations?.[0];

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingQrItem(item)}
                              className="group flex items-center gap-1.5 font-mono font-bold text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary px-2 py-1 rounded-md transition-colors"
                              title="Click to view QR Standee"
                            >
                              <QrCode className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                              <span>{item.assetTag || 'UNTAGGED'}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{item.name}</div>
                            {(item.brand || item.modelNumber) && (
                              <div className="text-[10px] text-muted-foreground">
                                {item.brand} {item.modelNumber}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {getCategoryIcon(item.category)}
                              <span className="capitalize">{item.category.toLowerCase()}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {item.serialNumber || 'N/A'}
                          </td>

                          <td className="py-3 px-4">
                            {item.category === 'CAMERA' ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`font-mono font-bold ${
                                      isHighWear ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                                    }`}
                                  >
                                    {item.currentShutterCount.toLocaleString()}
                                  </span>
                                  {isHighWear && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-red-500/10 text-red-500 border-red-500/20"
                                    >
                                      High Wear
                                    </Badge>
                                  )}
                                </div>
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      item.currentShutterCount > 150000
                                        ? 'bg-red-500'
                                        : item.currentShutterCount > 80000
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (item.currentShutterCount / 200000) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {getStatusBadge(item.status)}
                            {item.status === 'IN_USE' && activeAlloc && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[140px] pt-0.5">
                                Crew: {activeAlloc.assignedTo?.name || 'Assigned'}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'AVAILABLE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  onClick={() => {
                                    setSelectedEquipmentId(item.id);
                                    setMaintenanceModalMode('SEND');
                                    setIsMaintenanceModalOpen(true);
                                  }}
                                  title="Send to Maintenance"
                                >
                                  <Wrench className="w-3.5 h-3.5 mr-1" />
                                  Service
                                </Button>
                              )}

                              {item.status === 'MAINTENANCE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  onClick={() => {
                                    const openJob = item.maintenances?.[0];
                                    if (openJob) {
                                      setSelectedMaintenanceRecord({
                                        id: openJob.id,
                                        equipmentId: item.id,
                                        vendorName: openJob.vendorName,
                                        issueCategory: openJob.issueCategory,
                                        actualCost: openJob.actualCost,
                                        status: openJob.status,
                                        sentDate: openJob.sentDate,
                                        equipment: {
                                          id: item.id,
                                          name: item.name,
                                          assetTag: item.assetTag,
                                          serialNumber: item.serialNumber,
                                        },
                                      });
                                    }
                                    setMaintenanceModalMode('RESOLVE');
                                    setIsMaintenanceModalOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ACTIVE SHOOT ALLOCATIONS */}
        <TabsContent value="allocations" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4">Asset Tag</th>
                    <th className="py-3 px-4">Shoot Booking</th>
                    <th className="py-3 px-4">Assigned Crew Member</th>
                    <th className="py-3 px-4">Allocation Status</th>
                    <th className="py-3 px-4 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {initialActiveAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active gear allocations for shoots.
                      </td>
                    </tr>
                  ) : (
                    initialActiveAllocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {alloc.equipment.name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-xs">
                          {alloc.equipment.assetTag || 'NO TAG'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {alloc.eventBooking.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {alloc.eventBooking.bookingNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">
                            {alloc.assignedTo?.name || 'Unassigned Freelancer'}
                          </div>
                          {alloc.assignedTo?.phone && (
                            <div className="text-[10px] text-muted-foreground">
                              {alloc.assignedTo.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {alloc.status === 'ALLOCATED' && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">
                              Ready for Dispatch
                            </Badge>
                          )}
                          {alloc.status === 'CHECKED_OUT' && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-bold">
                              In Field
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {alloc.status === 'ALLOCATED' ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => {
                                setSelectedAllocationId(alloc.id);
                                setDispatchModalMode('CHECKOUT');
                                setIsDispatchModalOpen(true);
                              }}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                              Scan Out
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setSelectedAllocationId(alloc.id);
                                setDispatchModalMode('CHECKIN');
                                setIsDispatchModalOpen(true);
                              }}
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                              Check In
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: MAINTENANCE LOGS */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Equipment Item</th>
                    <th className="py-3 px-4">Vendor / Repair Center</th>
                    <th className="py-3 px-4">Issue Category</th>
                    <th className="py-3 px-4">Sent Date</th>
                    <th className="py-3 px-4">Estimated/Actual Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {initialMaintenanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No active or past maintenance records logged.
                      </td>
                    </tr>
                  ) : (
                    initialMaintenanceRecords.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{m.equipment.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {m.equipment.assetTag || 'NO TAG'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{m.vendorName}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {m.issueCategory}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(m.sentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {m.actualCost ? `₹${Number(m.actualCost).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.status === 'OPEN' ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px]">
                              In Repair (Open)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]">
                              Resolved
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {m.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedMaintenanceRecord(m);
                                setMaintenanceModalMode('RESOLVE');
                                setIsMaintenanceModalOpen(true);
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Dispatch / Check-in Modal */}
      <QrDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        isAdvancedInventoryEnabled={isAdvancedEnabled}
        activeAllocations={initialActiveAllocations}
        preselectedAllocationId={selectedAllocationId}
        defaultMode={dispatchModalMode}
        onSuccess={() => {
          startTransition(() => router.refresh());
        }}
      />

      {/* Maintenance Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        allEquipment={initialEquipments}
        preselectedEquipmentId={selectedEquipmentId}
        activeMaintenanceRecord={selectedMaintenanceRecord}
        mode={maintenanceModalMode}
        onSuccess={() => {
          startTransition(() => router.refresh());
        }}
      />

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          startTransition(() => router.refresh());
        }}
      />

      {/* Printable Asset QR Standee Modal */}
      {viewingQrItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setViewingQrItem(null)}
        >
          <div
            className="bg-card text-card-foreground max-w-sm w-full p-6 rounded-2xl shadow-2xl border text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Equipment Asset Tag
              </span>
              <button
                type="button"
                onClick={() => setViewingQrItem(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white text-black inline-block border-2 border-black/10 shadow-sm">
              <div className="w-36 h-36 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 p-2 text-center">
                <QrCode className="w-20 h-20 text-neutral-800" />
                <span className="font-mono text-[10px] font-bold mt-1 tracking-tight text-neutral-600">
                  {viewingQrItem.assetTag || 'PRATIMA-ERP'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-foreground">{viewingQrItem.name}</h3>
              <p className="font-mono text-xs text-primary font-bold">{viewingQrItem.assetTag || 'NO TAG'}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Serial: {viewingQrItem.serialNumber || 'N/A'} | Shutter: {viewingQrItem.currentShutterCount.toLocaleString()}
              </p>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => window.print()}>
                Print Barcode / Asset Tag Sticker
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
