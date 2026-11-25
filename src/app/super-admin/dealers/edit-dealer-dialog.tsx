'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit2, Building, Phone, Percent, Landmark, Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { updateDealerAction } from '@/actions/super-admin-dealer.actions';

interface EditDealerDialogProps {
  dealer: {
    id: string;
    dealerCode: string;
    businessName: string;
    contactPerson: string;
    phone: string;
    city: string | null;
    commissionPercent: number;
    firstPaymentDiscountPercent: number;
    bankDetails: string | null;
    isActive: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditDealerDialog({
  dealer,
  open,
  onOpenChange,
  onUpdated,
}: EditDealerDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    businessName: dealer?.businessName || '',
    contactPerson: dealer?.contactPerson || '',
    phone: dealer?.phone || '',
    city: dealer?.city || '',
    commissionPercent: dealer?.commissionPercent || 20,
    firstPaymentDiscountPercent: dealer?.firstPaymentDiscountPercent || 10,
    bankDetails: dealer?.bankDetails || '',
    isActive: dealer?.isActive ?? true,
  });

  // Sync state if selected dealer changes
  React.useEffect(() => {
    if (dealer) {
      setFormData({
        businessName: dealer.businessName,
        contactPerson: dealer.contactPerson,
        phone: dealer.phone,
        city: dealer.city || '',
        commissionPercent: dealer.commissionPercent,
        firstPaymentDiscountPercent: dealer.firstPaymentDiscountPercent,
        bankDetails: dealer.bankDetails || '',
        isActive: dealer.isActive,
      });
    }
  }, [dealer]);

  if (!dealer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updateDealerAction({
          dealerId: dealer.id,
          businessName: formData.businessName.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim() || null,
          commissionPercent: Number(formData.commissionPercent),
          firstPaymentDiscountPercent: Number(formData.firstPaymentDiscountPercent),
          bankDetails: formData.bankDetails.trim() || null,
          isActive: formData.isActive,
        });

        if (res.success) {
          toast.success(res.message);
          onOpenChange(false);
          router.refresh();
          onUpdated?.();
        } else {
          toast.error(res.error || 'Failed to update dealer');
        }
      } catch (err: any) {
        toast.error(err.message || 'Something went wrong');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Edit2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Edit Partner: {dealer.businessName}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-muted-foreground">
                Code: <span className="font-bold text-foreground">{dealer.dealerCode}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Business & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Name *</Label>
              <div className="relative">
                <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Person *</Label>
              <Input
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Phone & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone *</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>Recurring Commission (%) *</span>
              </div>
              <Input
                required
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commissionPercent}
                onChange={(e) =>
                  setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })
                }
                className="text-sm font-bold bg-background"
              />
            </div>

            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>First-Payment Discount (%) *</span>
              </div>
              <Input
                required
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.firstPaymentDiscountPercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstPaymentDiscountPercent: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-sm font-bold bg-background"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Bank &amp; Settlement Details</span>
            </div>
            <Textarea
              rows={2}
              value={formData.bankDetails}
              onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
              className="text-xs font-mono"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-xs font-semibold">Dealer Account Active</p>
              <p className="text-[11px] text-muted-foreground">
                When suspended, referral discounts and dealer login access are immediately revoked.
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
