'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  User,
  Calendar,
  Plus,
  Trash2,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { checkoutGearAction, checkinGearAction } from '@/actions/dispatch.actions';
import { toast } from 'sonner';

export interface AllocationItem {
  id: string;
  status: string;
  checkedOutAt?: Date | string | null;
  returnedAt?: Date | string | null;
  checkoutNotes?: string | null;
  returnNotes?: string | null;
  equipment: {
    id: string;
    name: string;
    category: string;
    brand?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
    assetTag?: string | null;
    currentShutterCount?: number;
    status: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  eventBooking: {
    id: string;
    title: string;
    bookingNumber: string;
    startDate?: Date | string | null;
  };
}

interface QrDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdvancedInventoryEnabled: boolean;
  activeAllocations: AllocationItem[];
  preselectedAllocationId?: string | null;
  defaultMode?: 'CHECKOUT' | 'CHECKIN';
  onSuccess?: () => void;
}

const DEFAULT_ACCESSORIES = [
  'Original Battery (100% Charged)',
  'Dual High-Speed SD / CFexpress Cards',
  'Lens Front & Rear Protective Caps',
  'Dedicated Wall Charger & Cable',
  'Camera / Gimbal Quick-Release Strap',
  'Padded Weatherproof Transport Case',
];

export function QrDispatchModal({
  isOpen,
  onClose,
  isAdvancedInventoryEnabled,
  activeAllocations,
  preselectedAllocationId,
  defaultMode = 'CHECKOUT',
  onSuccess,
}: QrDispatchModalProps) {
  const [mode, setMode] = useState<'CHECKOUT' | 'CHECKIN'>(defaultMode);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [scannedAssetTag, setScannedAssetTag] = useState<string>('');
  const [shutterCount, setShutterCount] = useState<number | string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDamaged, setIsDamaged] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dynamic accessories checklist state
  const [checklist, setChecklist] = useState<Array<{ id: string; label: string; checked: boolean }>>([]);
  const [customAccessory, setCustomAccessory] = useState<string>('');

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Filter allocations matching the active mode
  const eligibleAllocations = activeAllocations.filter((alloc) => {
    if (mode === 'CHECKOUT') {
      return alloc.status === 'ALLOCATED';
    } else {
      return alloc.status === 'CHECKED_OUT' || alloc.status === 'IN_FIELD';
    }
  });

  const selectedAllocation = activeAllocations.find((a) => a.id === selectedAllocationId);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      const targetId =
        preselectedAllocationId || (eligibleAllocations.length > 0 ? eligibleAllocations[0].id : '');
      setSelectedAllocationId(targetId);
      setScannedAssetTag('');
      setNotes('');
      setIsDamaged(false);

      // Initialize checklist
      setChecklist(
        DEFAULT_ACCESSORIES.map((label, idx) => ({
          id: `acc-${idx}`,
          label,
          checked: true,
        }))
      );
    }
  }, [isOpen, defaultMode, preselectedAllocationId]);

  // When selected allocation changes, populate shutter count
  useEffect(() => {
    if (selectedAllocation?.equipment?.currentShutterCount !== undefined) {
      setShutterCount(selectedAllocation.equipment.currentShutterCount);
    } else {
      setShutterCount('');
    }
    // Auto-focus scanner input in advanced mode
    if (isAdvancedInventoryEnabled && isOpen) {
      setTimeout(() => scanInputRef.current?.focus(), 150);
    }
  }, [selectedAllocationId, selectedAllocation, isAdvancedInventoryEnabled, isOpen]);

  // Tag validation check
  const expectedAssetTag = selectedAllocation?.equipment?.assetTag || '';
  const isTagMatching =
    expectedAssetTag &&
    scannedAssetTag.trim().toLowerCase() === expectedAssetTag.trim().toLowerCase();

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddCustomAccessory = () => {
    if (!customAccessory.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: customAccessory.trim(),
        checked: true,
      },
    ]);
    setCustomAccessory('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAllocationId) {
      toast.error('Please select an allocated gear item.');
      return;
    }

    if (isAdvancedInventoryEnabled) {
      if (!scannedAssetTag.trim()) {
        toast.error('Scan or enter the item Asset Tag QR code before confirming.');
        scanInputRef.current?.focus();
        return;
      }
      if (!isTagMatching) {
        toast.error(
          `Tag Mismatch: Scanned "${scannedAssetTag}" does not match allocated asset "${expectedAssetTag}".`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build accessories JSON record
      const checklistPayload: Record<string, boolean> = {};
      checklist.forEach((item) => {
        checklistPayload[item.label] = item.checked;
      });

      const parsedShutter =
        shutterCount !== '' && !isNaN(Number(shutterCount)) ? Number(shutterCount) : undefined;

      if (mode === 'CHECKOUT') {
        const res = await checkoutGearAction({
          allocationId: selectedAllocationId,
          scannedAssetTag: isAdvancedInventoryEnabled ? scannedAssetTag.trim() : undefined,
          checklist: checklistPayload,
          notes: notes.trim() || undefined,
          shutterCount: parsedShutter,
        });

        if (!res.success) {
          toast.error(res.error || 'Failed to dispatch gear.');
          return;
        }

        toast.success(res.message || 'Equipment successfully dispatched and logged!');
      } else {
        const res = await checkinGearAction({
          allocationId: selectedAllocationId,
          scannedAssetTag: isAdvancedInventoryEnabled ? scannedAssetTag.trim() : undefined,
          checklist: checklistPayload,
          notes: notes.trim() || undefined,
          shutterCount: parsedShutter,
          isDamaged,
        });

        if (!res.success) {
          toast.error(res.error || 'Failed to return gear.');
          return;
        }

        toast.success(res.message || 'Equipment successfully returned to inventory!');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Unexpected error occurred during gear processing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2.5 rounded-xl ${
                  mode === 'CHECKOUT'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {mode === 'CHECKOUT' ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {mode === 'CHECKOUT' ? 'Equipment Dispatch (Check-Out)' : 'Equipment Return (Check-In)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {mode === 'CHECKOUT'
                    ? 'Verify items, inspect accessories, and hand over equipment to crew.'
                    : 'Inspect returning equipment, record actuations, and check for damages.'}
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant={isAdvancedInventoryEnabled ? 'default' : 'outline'}
              className={
                isAdvancedInventoryEnabled
                  ? 'bg-blue-600 text-white font-semibold flex items-center gap-1.5'
                  : 'text-muted-foreground font-normal'
              }
            >
              <QrCode className="w-3.5 h-3.5" />
              {isAdvancedInventoryEnabled ? 'Enterprise QR Mode' : 'Simple Mode'}
            </Badge>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-lg w-fit mt-2">
            <Button
              type="button"
              variant={mode === 'CHECKOUT' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs font-semibold h-7 px-3"
              onClick={() => {
                setMode('CHECKOUT');
                setSelectedAllocationId('');
              }}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Dispatch Out
            </Button>
            <Button
              type="button"
              variant={mode === 'CHECKIN' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs font-semibold h-7 px-3"
              onClick={() => {
                setMode('CHECKIN');
                setSelectedAllocationId('');
              }}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
              Return In
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Step 1: Select Shoot Allocation */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Select Allocated Shoot & Gear Item
            </Label>
            {eligibleAllocations.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  No gear items currently pending {mode === 'CHECKOUT' ? 'dispatch' : 'return'}.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Allocate gear to upcoming shoots via the Logistics Workbench first.
                </p>
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
              >
                <option value="">-- Choose Allocation --</option>
                {eligibleAllocations.map((alloc) => (
                  <option key={alloc.id} value={alloc.id}>
                    {alloc.equipment.name} ({alloc.equipment.assetTag || 'Untagged'}) — Shoot:{' '}
                    {alloc.eventBooking.title} ({alloc.assignedTo?.name || 'Unassigned Crew'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Allocation Details Card */}
          {selectedAllocation && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-primary" />
                    {selectedAllocation.equipment.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Category: {selectedAllocation.equipment.category} | Serial:{' '}
                    {selectedAllocation.equipment.serialNumber || 'N/A'}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs font-bold bg-background">
                  Tag: {selectedAllocation.equipment.assetTag || 'NO TAG'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Crew: {selectedAllocation.assignedTo?.name || 'Unassigned Freelancer'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Shoot: {selectedAllocation.eventBooking.title}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Enterprise QR / Barcode Scanner Input */}
          {isAdvancedInventoryEnabled && selectedAllocation && (
            <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="scanInput"
                  className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide"
                >
                  <Scan className="w-4 h-4 animate-pulse text-primary" />
                  Scan Asset Tag (Barcode / QR Scanner Gun)
                </Label>
                {scannedAssetTag && (
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      isTagMatching ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {isTagMatching ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tag Verified Match
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Mismatch with Allocated Item
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="relative">
                <Input
                  ref={scanInputRef}
                  id="scanInput"
                  type="text"
                  placeholder="Focus here & scan barcode with handheld scanner..."
                  value={scannedAssetTag}
                  onChange={(e) => setScannedAssetTag(e.target.value)}
                  className={`font-mono text-sm tracking-wider pl-9 bg-background ${
                    scannedAssetTag && isTagMatching
                      ? 'border-emerald-500 ring-1 ring-emerald-500'
                      : scannedAssetTag && !isTagMatching
                      ? 'border-red-500 ring-1 ring-red-500'
                      : ''
                  }`}
                  autoComplete="off"
                />
                <QrCode className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Expected tag:{' '}
                <strong className="font-mono text-foreground">
                  {expectedAssetTag || 'None configured for this equipment'}
                </strong>
                . Point your scanner gun at the equipment body or type the tag manually.
              </p>
            </div>
          )}

          {/* Step 3: Shutter Count Audit (Cameras) */}
          {selectedAllocation?.equipment?.category === 'CAMERA' && (
            <div className="space-y-1.5">
              <Label htmlFor="shutterInput" className="text-xs font-semibold">
                Actuations / Shutter Count at Handover
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="shutterInput"
                  type="number"
                  min="0"
                  value={shutterCount}
                  onChange={(e) => setShutterCount(e.target.value)}
                  placeholder="e.g. 42350"
                  className="font-mono text-sm max-w-[200px]"
                />
                <span className="text-xs text-muted-foreground">
                  Last recorded:{' '}
                  <strong>{selectedAllocation.equipment.currentShutterCount?.toLocaleString() || 0}</strong>{' '}
                  clicks
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Digital Accessories Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Physical Accessories Checklist
              </Label>
              <button
                type="button"
                onClick={() =>
                  setChecklist((prev) => prev.map((item) => ({ ...item, checked: true })))
                }
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Check All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-border/70 bg-card/50">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs hover:bg-muted/40 transition-colors"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleChecklistItem(item.id)}
                    />
                    <span className={item.checked ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {item.label}
                    </span>
                  </label>
                  {item.id.startsWith('custom-') && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Accessory Add */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="text"
                placeholder="Add special accessory (e.g. ND Filter, Monopod)..."
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAccessory();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={handleAddCustomAccessory}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Return In: Damage Report Checkbox */}
          {mode === 'CHECKIN' && (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isDamaged}
                  onCheckedChange={(checked) => setIsDamaged(Boolean(checked))}
                />
                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Report Damage or Malfunction (Automatically tags for Maintenance)
                </span>
              </label>
              {isDamaged && (
                <p className="text-[11px] text-red-500/90 pl-6">
                  This asset will be quarantined from subsequent shoot allocations until certified by maintenance.
                </p>
              )}
            </div>
          )}

          {/* Condition Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Inspection & Condition Notes
            </Label>
            <Textarea
              id="notes"
              placeholder={
                mode === 'CHECKOUT'
                  ? 'Note physical condition, pre-existing cosmetic scratches, battery charge status...'
                  : 'Note returns condition, cleanliness of optics, accessories returned...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedAllocationId}
              className={`font-semibold ${
                mode === 'CHECKOUT'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Processing...
                </>
              ) : mode === 'CHECKOUT' ? (
                'Confirm Gear Dispatch'
              ) : (
                'Confirm Gear Return'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
