'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Tag,
  Clock,
  Layers,
  Briefcase,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import {
  allocateGearToShootAction,
  deallocateGearFromShootAction,
} from '@/actions/shoot-logistics.actions';

const CATEGORIES = [
  'ALL',
  'CAMERA',
  'LENS',
  'LIGHTING',
  'DRONE',
  'AUDIO',
  'STABILIZER',
  'ACCESSORY',
];

export interface GearAllocationCardProps {
  booking: any;
  availableEquipment: any[];
  teamMembers: any[];
  onRefresh: () => void;
  className?: string;
}

export function GearAllocationCard({
  booking,
  availableEquipment = [],
  teamMembers = [],
  onRefresh,
  className,
}: GearAllocationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation Dialog State
  const [modalSearch, setModalSearch] = useState('');
  const [modalCatFilter, setModalCatFilter] = useState('ALL');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [targetSubEventId, setTargetSubEventId] = useState<string>('all');
  const [assignedUserId, setAssignedUserId] = useState<string>('unassigned');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [isDeallocating, setIsDeallocating] = useState<string | null>(null);

  const allocations = booking?.shootGearAllocations || [];
  const subEvents = booking?.subEvents || [];

  // Identify external freelancers bringing their own gear (BYOG)
  const byogCrewMembers = useMemo(() => {
    const list: Array<{ name: string; role: string; gear: string }> = [];
    (booking?.subEvents || []).forEach((s: any) => {
      (s.staffAssignments || []).forEach((asg: any) => {
        if (asg.expectedGearList && asg.expectedGearList.trim()) {
          list.push({
            name: asg.user?.name || 'Freelancer',
            role: asg.role,
            gear: asg.expectedGearList.trim(),
          });
        }
      });
    });
    (booking?.assignments || []).forEach((asg: any) => {
      if (asg.expectedGearList && asg.expectedGearList.trim()) {
        if (!list.some((l) => l.name === asg.user?.name)) {
          list.push({
            name: asg.user?.name || 'Freelancer',
            role: asg.role,
            gear: asg.expectedGearList.trim(),
          });
        }
      }
    });
    return list;
  }, [booking]);

  // Filter allocated gear list
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item: any) => {
      const eq = item.equipment;
      if (!eq) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        eq.name?.toLowerCase().includes(q) ||
        eq.brand?.toLowerCase().includes(q) ||
        eq.serialNumber?.toLowerCase().includes(q) ||
        item.assignedTo?.name?.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || eq.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [allocations, searchQuery, categoryFilter]);

  // Filter available equipment for the modal picker
  const allocatedEquipmentIdSet = useMemo(() => {
    return new Set(allocations.map((a: any) => a.equipmentId));
  }, [allocations]);

  const modalEquipmentList = useMemo(() => {
    return availableEquipment.filter((eq: any) => {
      // Exclude already allocated equipment for this shoot
      if (allocatedEquipmentIdSet.has(eq.id)) return false;

      const q = modalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        eq.name?.toLowerCase().includes(q) ||
        eq.brand?.toLowerCase().includes(q) ||
        eq.modelNumber?.toLowerCase().includes(q) ||
        eq.serialNumber?.toLowerCase().includes(q);

      const matchesCat = modalCatFilter === 'ALL' || eq.category === modalCatFilter;
      return matchesSearch && matchesCat;
    });
  }, [availableEquipment, allocatedEquipmentIdSet, modalSearch, modalCatFilter]);

  const handleOpenModal = () => {
    setSelectedEquipmentIds([]);
    setModalSearch('');
    setModalCatFilter('ALL');
    setTargetSubEventId('all');
    setAssignedUserId('unassigned');
    setCheckoutNotes('');
    setModalOpen(true);
  };

  const toggleSelectEquipment = (eqId: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId]
    );
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEquipmentIds.length === 0) {
      toast.error('Please select at least one equipment item to allocate');
      return;
    }

    setIsAllocating(true);
    try {
      const res = await allocateGearToShootAction({
        bookingId: booking.id,
        subEventId: targetSubEventId !== 'all' ? targetSubEventId : null,
        equipmentIds: selectedEquipmentIds,
        assignedToUserId: assignedUserId !== 'unassigned' ? assignedUserId : null,
        checkoutNotes: checkoutNotes || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to allocate equipment');
        return;
      }

      toast.success(`Successfully allocated ${selectedEquipmentIds.length} equipment items!`);
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error allocating equipment');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleDeallocate = async (allocationId: string) => {
    if (!confirm('Remove this equipment from the shoot allocation?')) return;

    setIsDeallocating(allocationId);
    try {
      const res = await deallocateGearFromShootAction(allocationId);
      if (!res.success) {
        toast.error(res.error || 'Failed to deallocate equipment');
        return;
      }
      toast.success('Equipment released back to inventory');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error deallocating equipment');
    } finally {
      setIsDeallocating(null);
    }
  };

  return (
    <Card className={cn('border-border/80 shadow-xs flex flex-col h-full', className)}>
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Gear & Kit Allocation</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Check out cameras, lenses, drones, and audio gear for this shoot.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={handleOpenModal}
            className="h-8 text-xs font-bold gap-1.5 shrink-0 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Allocate Gear</span>
          </Button>
        </div>

        {/* Category Pills & Search */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors shrink-0',
                  categoryFilter === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter gear..."
              className="h-7 pl-7 text-[11px]"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 space-y-3 overflow-y-auto max-h-[500px]">
        {/* Freelancer BYOG Notice */}
        {byogCrewMembers.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/25 text-xs flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                <span>Contractor BYOG Active ({byogCrewMembers.length} Freelancer{byogCrewMembers.length > 1 ? 's' : ''})</span>
                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-300">
                  Self-Equipped
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                External contractors bring their contracted equipment without checking out studio inventory. Studio gear below is reserved for internal crew & supplemental production.
              </p>
            </div>
          </div>
        )}

        {filteredAllocations.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl space-y-2 bg-muted/20">
            <Package className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Equipment Allocated Yet</p>
            <p className="text-[11px] text-muted-foreground">
              Click &quot;Allocate Gear&quot; to check out cameras, lenses, and lighting kits.
            </p>
          </div>
        ) : (
          filteredAllocations.map((item: any) => {
            const eq = item.equipment;
            if (!eq) return null;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between gap-3 text-xs hover:border-border transition-colors shadow-2xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">
                      {eq.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 uppercase font-semibold text-muted-foreground"
                    >
                      {eq.category}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {eq.brand && (
                      <span>
                        {eq.brand} {eq.modelNumber || ''}
                      </span>
                    )}
                    {eq.serialNumber && (
                      <span className="font-mono text-[10px] bg-muted/60 px-1 rounded">
                        S/N: {eq.serialNumber}
                      </span>
                    )}
                    {item.assignedTo && (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <User className="w-2.5 h-2.5" />
                        Custodian: {item.assignedTo.name}
                      </span>
                    )}
                    {item.subEvent && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Tag className="w-2.5 h-2.5" />
                        {item.subEvent.name}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeallocate(item.id)}
                  disabled={isDeallocating === item.id}
                  className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                  title="Deallocate gear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Allocate Gear Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Allocate Equipment from Inventory</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select available cameras, lenses, and accessories with conflict detection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAllocateSubmit} className="space-y-4 py-2 flex-1 flex flex-col min-h-0">
            {/* Modal Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search available equipment or S/N..."
                  className="h-8 pl-7 text-xs"
                />
              </div>

              <Select value={modalCatFilter} onValueChange={(val) => setModalCatFilter(val || 'ALL')}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inventory Equipment Checklist */}
            <div className="flex-1 overflow-y-auto border rounded-xl divide-y divide-border/40 p-1 max-h-52 min-h-36">
              {modalEquipmentList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No available equipment matches your search.
                </div>
              ) : (
                modalEquipmentList.map((eq: any) => {
                  const isChecked = selectedEquipmentIds.includes(eq.id);

                  return (
                    <label
                      key={eq.id}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-colors',
                        isChecked ? 'bg-primary/10' : 'hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectEquipment(eq.id)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        <div className="space-y-0.5 truncate">
                          <span className="font-semibold text-foreground block truncate">
                            {eq.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {eq.brand || ''} {eq.modelNumber || ''}{' '}
                            {eq.serialNumber ? `• S/N: ${eq.serialNumber}` : ''}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 uppercase shrink-0 font-semibold"
                      >
                        {eq.category}
                      </Badge>
                    </label>
                  );
                })
              )}
            </div>

            {/* Custodian & Function Assignment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Assign Custodian (Crew Member)</Label>
                <Select value={assignedUserId} onValueChange={(val) => setAssignedUserId(val || 'unassigned')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unassigned (Studio Desk)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="unassigned" className="text-xs">
                      Unassigned (General Studio Kit)
                    </SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name} ({m.designation || 'Crew'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Assign to Sub-Event Function</Label>
                <Select value={targetSubEventId} onValueChange={(val) => setTargetSubEventId(val || 'all')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Entire Event" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all" className="text-xs">
                      Entire Event (All Functions)
                    </SelectItem>
                    {subEvents.map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id} className="text-xs">
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Kit / Checkout Notes (Optional)</Label>
              <Input
                placeholder="e.g., Include 2 extra batteries and dual chargers"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isAllocating || selectedEquipmentIds.length === 0}
                className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isAllocating
                    ? 'Allocating...'
                    : `Allocate (${selectedEquipmentIds.length}) Items`}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
