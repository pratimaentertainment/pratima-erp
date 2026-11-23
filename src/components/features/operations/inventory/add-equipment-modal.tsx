'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { PlusCircle, Loader2, QrCode } from 'lucide-react';
import { createEquipmentAssetAction } from '@/actions/inventory.actions';
import { EquipmentCategory } from '@prisma/client';
import { toast } from 'sonner';

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddEquipmentModal({ isOpen, onClose, onSuccess }: AddEquipmentModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>(EquipmentCategory.CAMERA);
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [shutterCount, setShutterCount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Equipment name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createEquipmentAssetAction({
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        modelNumber: modelNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        assetTag: assetTag.trim() || undefined,
        currentShutterCount: Number(shutterCount) || 0,
        bufferHours: 4,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to register equipment.');
        return;
      }

      toast.success(res.message || 'Equipment registered successfully.');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred while creating equipment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Register New Equipment & Asset Tag
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add camera bodies, specialty lenses, drones, or audio hardware with tracking tags.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Equipment Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Sony Alpha 7 IV Body"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-ring h-9"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
              >
                <option value={EquipmentCategory.CAMERA}>CAMERA (Body)</option>
                <option value={EquipmentCategory.LENS}>LENS (Prime / Zoom)</option>
                <option value={EquipmentCategory.DRONE}>DRONE (Aerial)</option>
                <option value={EquipmentCategory.LIGHTING}>LIGHTING (Flash / Strobe / LED)</option>
                <option value={EquipmentCategory.AUDIO}>AUDIO (Mics / Wireless Kit)</option>
                <option value={EquipmentCategory.ACCESSORY}>ACCESSORY (Gimbal / Tripod / Rig)</option>
              </select>
            </div>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-xs font-semibold">
                Brand / Manufacturer
              </Label>
              <Input
                id="brand"
                placeholder="e.g. Sony, Canon, DJI, Godox"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs font-semibold">
                Model Number
              </Label>
              <Input
                id="model"
                placeholder="e.g. ILCE-7M4, RF 70-200mm"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Asset Tag & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border">
            <div className="space-y-1.5">
              <Label htmlFor="assetTag" className="text-xs font-bold flex items-center gap-1 text-primary">
                <QrCode className="w-3.5 h-3.5" />
                Asset Tag (QR / Barcode)
              </Label>
              <Input
                id="assetTag"
                placeholder="Leave blank to auto-generate"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                className="text-xs font-mono font-bold tracking-wider"
              />
              <p className="text-[10px] text-muted-foreground">e.g. CAM-001, LENS-85-02</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serial" className="text-xs font-semibold">
                Manufacturer Serial Number
              </Label>
              <Input
                id="serial"
                placeholder="e.g. 4820194829"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Engraved factory serial #</p>
            </div>
          </div>

          {/* Shutter Count (For Camera Bodies) */}
          {category === EquipmentCategory.CAMERA && (
            <div className="space-y-1.5">
              <Label htmlFor="shutter" className="text-xs font-semibold">
                Current Shutter Count / Actuations
              </Label>
              <Input
                id="shutter"
                type="number"
                min="0"
                placeholder="0"
                value={shutterCount}
                onChange={(e) => setShutterCount(Number(e.target.value))}
                className="text-xs font-mono max-w-[200px]"
              />
            </div>
          )}

          {/* Purchase Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-semibold">
                Purchase Price (₹)
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="e.g. 195000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pDate" className="text-xs font-semibold">
                Purchase Date
              </Label>
              <Input
                id="pDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wDate" className="text-xs font-semibold">
                Warranty Expiry Date
              </Label>
              <Input
                id="wDate"
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Notes & Technical Specs
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Bought from authorized dealer with extended 3-year warranty..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Register Equipment Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
