'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { Wrench, AlertOctagon, CheckCircle2, Loader2, IndianRupee, Calendar } from 'lucide-react';
import { sendToMaintenanceAction, resolveMaintenanceAction } from '@/actions/inventory.actions';
import { toast } from 'sonner';

export interface EquipmentItemForMaintenance {
  id: string;
  name: string;
  category: string;
  serialNumber?: string | null;
  assetTag?: string | null;
  status: string;
  brand?: string | null;
  modelNumber?: string | null;
}

export interface MaintenanceRecordItem {
  id: string;
  equipmentId: string;
  vendorName: string;
  issueCategory: string;
  issueDescription?: string | null;
  actualCost?: any;
  status: string;
  sentDate: Date | string;
  returnDate?: Date | string | null;
  notes?: string | null;
  equipment: {
    id: string;
    name: string;
    assetTag?: string | null;
    serialNumber?: string | null;
  };
}

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEquipment: EquipmentItemForMaintenance[];
  preselectedEquipmentId?: string | null;
  activeMaintenanceRecord?: MaintenanceRecordItem | null;
  mode?: 'SEND' | 'RESOLVE';
  onSuccess?: () => void;
}

const ISSUE_CATEGORIES = [
  { value: 'FUNGUS', label: 'Fungus & Moisture Cleaning (Optics)' },
  { value: 'SENSOR', label: 'Sensor Cleaning & Calibration (Hot Pixels/Dust)' },
  { value: 'SHUTTER', label: 'Shutter Unit Replacement & Recalibration' },
  { value: 'PHYSICAL_DAMAGE', label: 'Physical Impact / Mount / Chassis Repair' },
  { value: 'ELECTRONIC', label: 'Autofocus / Motherboard / Port Failure' },
  { value: 'GENERAL_SERVICE', label: 'Preventative Studio Maintenance & Firmware' },
];

export function MaintenanceModal({
  isOpen,
  onClose,
  allEquipment,
  preselectedEquipmentId,
  activeMaintenanceRecord,
  mode = 'SEND',
  onSuccess,
}: MaintenanceModalProps) {
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [issueCategory, setIssueCategory] = useState<string>('SENSOR');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'RESOLVE' && activeMaintenanceRecord) {
        setEquipmentId(activeMaintenanceRecord.equipmentId);
        setVendorName(activeMaintenanceRecord.vendorName);
        setIssueCategory(activeMaintenanceRecord.issueCategory);
        setIssueDescription(activeMaintenanceRecord.issueDescription || '');
        setCost(activeMaintenanceRecord.actualCost ? String(activeMaintenanceRecord.actualCost) : '');
        setNotes('');
      } else {
        const initialEqId = preselectedEquipmentId || (allEquipment.length > 0 ? allEquipment[0].id : '');
        setEquipmentId(initialEqId);
        setVendorName('');
        setIssueCategory('SENSOR');
        setIssueDescription('');
        setCost('');
        setReturnDate('');
        setNotes('');
      }
    }
  }, [isOpen, mode, preselectedEquipmentId, activeMaintenanceRecord, allEquipment]);

  const selectedEquipment = allEquipment.find((e) => e.id === equipmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'SEND') {
      if (!equipmentId) {
        toast.error('Please select an equipment item.');
        return;
      }
      if (!vendorName.trim()) {
        toast.error('Please enter the repair service vendor or lab name.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await sendToMaintenanceAction({
          equipmentId,
          vendorName: vendorName.trim(),
          issueCategory,
          issueDescription: issueDescription.trim() || undefined,
          estimatedCost: cost ? Number(cost) : undefined,
          expectedReturnDate: returnDate ? new Date(returnDate) : undefined,
          notes: notes.trim() || undefined,
        });

        if (!res.success) {
          toast.error(res.error || 'Failed to send item to maintenance.');
          return;
        }

        toast.success(res.message || 'Equipment successfully quarantined and logged to maintenance.');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err?.message || 'Error occurred while logging maintenance.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Resolve mode
      if (!activeMaintenanceRecord?.id) {
        toast.error('Maintenance record ID is required to resolve.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await resolveMaintenanceAction({
          maintenanceId: activeMaintenanceRecord.id,
          actualCost: cost ? Number(cost) : undefined,
          notes: notes.trim() || undefined,
        });

        if (!res.success) {
          toast.error(res.error || 'Failed to resolve maintenance.');
          return;
        }

        toast.success(res.message || 'Maintenance resolved. Equipment is back to Available!');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err?.message || 'Error occurred while resolving maintenance.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-2.5 rounded-xl ${
                mode === 'SEND'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {mode === 'SEND' ? (
                <Wrench className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {mode === 'SEND'
                  ? 'Send Equipment to Maintenance & Servicing'
                  : 'Resolve Maintenance & Return to Inventory'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {mode === 'SEND'
                  ? 'Quarantine item from active shoot dispatches and track vendor servicing.'
                  : 'Record the completed servicing, final repair bill, and return asset to Available status.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {mode === 'SEND' ? (
            <>
              {/* Select Equipment */}
              <div className="space-y-1.5">
                <Label htmlFor="eqSelect" className="text-xs font-semibold">
                  Select Equipment Item
                </Label>
                <select
                  id="eqSelect"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                >
                  <option value="">-- Choose Equipment --</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.status === 'IN_USE'}>
                      {eq.name} ({eq.assetTag || 'No Tag'}) — [{eq.status}]
                      {eq.status === 'IN_USE' ? ' (In Use on Shoot)' : ''}
                    </option>
                  ))}
                </select>
                {selectedEquipment && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border text-xs flex items-center justify-between">
                    <span>
                      Serial: <strong>{selectedEquipment.serialNumber || 'N/A'}</strong> | Category:{' '}
                      <strong>{selectedEquipment.category}</strong>
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {selectedEquipment.assetTag || 'UNTAGGED'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Vendor & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor" className="text-xs font-semibold">
                    Authorized Vendor / Service Lab <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendor"
                    placeholder="e.g. Sony Service Center, Canon Pro..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Issue Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-ring h-9"
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost & Expected Return Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs font-semibold flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                    Estimated Servicing Cost (₹)
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    placeholder="e.g. 4500"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="returnDate" className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Expected Return Date
                  </Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold">
                  Problem Description & Symptoms
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Describe lens fungus location, shutter error code (ERR 20), sensor dust spots, drop marks..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>
            </>
          ) : (
            // RESOLVE MODE
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/40 border text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>{activeMaintenanceRecord?.equipment?.name}</span>
                  <Badge variant="outline" className="font-mono">
                    {activeMaintenanceRecord?.equipment?.assetTag}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Vendor: <strong>{activeMaintenanceRecord?.vendorName}</strong> | Category:{' '}
                  <strong>{activeMaintenanceRecord?.issueCategory}</strong>
                </p>
                {activeMaintenanceRecord?.issueDescription && (
                  <p className="text-muted-foreground italic text-[11px]">
                    "{activeMaintenanceRecord.issueDescription}"
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actualCost" className="text-xs font-semibold flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                  Final Invoice / Actual Repair Cost (₹)
                </Label>
                <Input
                  id="actualCost"
                  type="number"
                  min="0"
                  placeholder="e.g. 5200"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resNotes" className="text-xs font-semibold">
                  Resolution Notes & Vendor Invoice / Job Sheet #
                </Label>
                <Textarea
                  id="resNotes"
                  placeholder="e.g. Shutter replaced under warranty, sensor dry-cleaned, Job Sheet #SONY-99214..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || (mode === 'SEND' && !equipmentId)}
              className={
                mode === 'SEND'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : mode === 'SEND' ? (
                'Quarantine Asset & Send to Maintenance'
              ) : (
                'Confirm Resolution & Return to Inventory'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
