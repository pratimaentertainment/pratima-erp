'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { createVehicleAction, updateVehicleAction } from '@/actions/vehicle.actions';
import { toast } from 'sonner';
import { Loader2, Car, ShieldAlert } from 'lucide-react';
import { AssetStatus } from '@prisma/client';

export interface VehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: any | null;
  branches: { id: string; name: string; code?: string | null }[];
  onSuccess: () => void;
}

export function VehicleModal({
  open,
  onOpenChange,
  vehicle,
  branches,
  onSuccess,
}: VehicleModalProps) {
  const isEditing = Boolean(vehicle?.id);

  const [plateNumber, setPlateNumber] = React.useState('');
  const [makeModel, setMakeModel] = React.useState('');
  const [type, setType] = React.useState<'VAN' | 'SUV' | 'SEDAN' | 'TEMPO' | 'TRUCK'>('VAN');
  const [capacity, setCapacity] = React.useState<number>(5);
  const [fuelType, setFuelType] = React.useState<'DIESEL' | 'PETROL' | 'ELECTRIC' | 'CNG' | 'HYBRID'>('DIESEL');
  const [driverName, setDriverName] = React.useState('');
  const [driverPhone, setDriverPhone] = React.useState('');
  const [status, setStatus] = React.useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [branchId, setBranchId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (vehicle) {
      setPlateNumber(vehicle.plateNumber || '');
      setMakeModel(vehicle.makeModel || '');
      setType(vehicle.type || 'VAN');
      setCapacity(vehicle.capacity || 5);
      setFuelType(vehicle.fuelType || 'DIESEL');
      setDriverName(vehicle.driverName || '');
      setDriverPhone(vehicle.driverPhone || '');
      setStatus(vehicle.status || AssetStatus.AVAILABLE);
      setBranchId(vehicle.branchId || (branches[0]?.id || ''));
      setNotes(vehicle.notes || '');
    } else {
      setPlateNumber('');
      setMakeModel('');
      setType('VAN');
      setCapacity(5);
      setFuelType('DIESEL');
      setDriverName('');
      setDriverPhone('');
      setStatus(AssetStatus.AVAILABLE);
      setBranchId(branches[0]?.id || '');
      setNotes('');
    }
    setErrorMsg(null);
  }, [vehicle, branches, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!plateNumber.trim()) {
      setErrorMsg('License Plate Number is required (e.g. MH12AB1234).');
      return;
    }
    if (!makeModel.trim()) {
      setErrorMsg('Vehicle Make & Model is required (e.g. Toyota Innova Crysta).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const res = await updateVehicleAction({
          id: vehicle.id,
          plateNumber: plateNumber.trim().toUpperCase(),
          makeModel: makeModel.trim(),
          type,
          capacity: Number(capacity) || 5,
          fuelType,
          driverName: driverName.trim() || null,
          driverPhone: driverPhone.trim() || null,
          status,
          branchId: branchId || null,
          notes: notes.trim() || null,
        });

        if (res.success) {
          toast.success(res.message || 'Vehicle updated successfully');
          onSuccess();
          onOpenChange(false);
        } else {
          setErrorMsg(res.error || 'Failed to update vehicle');
          toast.error(res.error || 'Failed to update vehicle');
        }
      } else {
        const res = await createVehicleAction({
          plateNumber: plateNumber.trim().toUpperCase(),
          makeModel: makeModel.trim(),
          type,
          capacity: Number(capacity) || 5,
          fuelType,
          driverName: driverName.trim() || null,
          driverPhone: driverPhone.trim() || null,
          status,
          branchId: branchId || null,
          notes: notes.trim() || null,
        });

        if (res.success) {
          toast.success(res.message || 'Vehicle added to fleet successfully');
          onSuccess();
          onOpenChange(false);
        } else {
          setErrorMsg(res.error || 'Failed to add vehicle');
          toast.error(res.error || 'Failed to add vehicle');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-heading">
                {isEditing ? `Edit Vehicle: ${vehicle.plateNumber}` : 'Add Vehicle to Fleet'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? 'Update vehicle parameters, default driver, or operational status.'
                  : 'Register a production van, SUV, or equipment transport vehicle into the fleet.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Plate Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Plate / Registration Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH 12 AB 1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full text-xs h-9 px-3 rounded-md border bg-background font-mono font-bold text-foreground focus:ring-1 focus:ring-primary uppercase"
              />
            </div>

            {/* Make & Model */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Make &amp; Model *</label>
              <input
                type="text"
                required
                placeholder="e.g. Toyota Innova Crysta"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Vehicle Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vehicle Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="VAN">Production Van</option>
                <option value="SUV">SUV (Innova/Fortuner)</option>
                <option value="SEDAN">Sedan</option>
                <option value="TEMPO">Tempo / Mini-Bus</option>
                <option value="TRUCK">Equipment Truck</option>
              </select>
            </div>

            {/* Passenger Capacity */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Passenger Capacity</label>
              <input
                type="number"
                min={1}
                max={60}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Fuel Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Fuel Type</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="CNG">CNG</option>
                <option value="ELECTRIC">Electric (EV)</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Driver Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Default Driver Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Patil"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Driver Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Driver Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Branch Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Stationed Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.code ? `(${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Operational Status */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full text-xs h-9 px-2.5 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value={AssetStatus.AVAILABLE}>AVAILABLE (Ready to dispatch)</option>
                <option value={AssetStatus.IN_USE}>IN USE (On shoot)</option>
                <option value={AssetStatus.MAINTENANCE}>MAINTENANCE (Servicing/Repairs)</option>
                <option value={AssetStatus.RETIRED}>RETIRED (Out of service)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Fleet Notes / PUC Expiry</label>
            <input
              type="text"
              placeholder="e.g. Insurance valid till Dec 2026, roof carrier installed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isEditing ? 'Save Changes' : 'Register Vehicle'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
