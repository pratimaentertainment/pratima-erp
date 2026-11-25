'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, UserPlus, Sparkles, Building, Phone, Mail, Percent, Landmark, Key, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDealerAction } from '@/actions/super-admin-dealer.actions';

export function AddDealerDialog({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    dealerCode: '',
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    city: '',
    password: 'Dealer@' + Math.floor(1000 + Math.random() * 9000),
    commissionPercent: 20,
    firstPaymentDiscountPercent: 10,
    bankDetails: '',
  });

  const handleGenerateCode = () => {
    const base = formData.contactPerson.split(' ')[0] || formData.businessName.split(' ')[0] || 'PARTNER';
    const clean = base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const code = `${clean || 'DEALER'}${formData.firstPaymentDiscountPercent || 10}`;
    setFormData((prev) => ({ ...prev, dealerCode: code }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dealerCode.trim()) {
      toast.error('Dealer referral code is required');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createDealerAction({
          dealerCode: formData.dealerCode.trim().toUpperCase(),
          businessName: formData.businessName.trim(),
          contactPerson: formData.contactPerson.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim() || undefined,
          password: formData.password,
          commissionPercent: Number(formData.commissionPercent),
          firstPaymentDiscountPercent: Number(formData.firstPaymentDiscountPercent),
          bankDetails: formData.bankDetails.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message);
          setOpen(false);
          setFormData({
            dealerCode: '',
            businessName: '',
            contactPerson: '',
            email: '',
            phone: '',
            city: '',
            password: 'Dealer@' + Math.floor(1000 + Math.random() * 9000),
            commissionPercent: 20,
            firstPaymentDiscountPercent: 10,
            bankDetails: '',
          });
          router.refresh();
          onCreated?.();
        } else {
          toast.error(res.error || 'Failed to create dealer');
        }
      } catch (err: any) {
        toast.error(err.message || 'Something went wrong');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <Plus className="h-4 w-4" />
            <span>Provision New Dealer</span>
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Provision New Partner / Dealer</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create an exclusive dealer account with unique referral code, custom commission rate, and client discount.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Business & Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business / Agency Name *</Label>
              <div className="relative">
                <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  placeholder="e.g. Shree Digital Solutions"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Person Full Name *</Label>
              <Input
                required
                placeholder="e.g. Rajesh Kumar"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Referral Code & Quick Generator */}
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Unique Referral Code *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateCode}
                className="h-6 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 px-2"
              >
                <Sparkles className="h-3 w-3" />
                Auto-Suggest Code
              </Button>
            </div>
            <Input
              required
              placeholder="e.g. RAJESH10 or DIGI20"
              value={formData.dealerCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dealerCode: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase(),
                })
              }
              className="text-sm font-mono uppercase font-bold tracking-wider bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Studios will use this code during signup/checkout or via link{' '}
              <span className="font-mono text-primary font-semibold">?ref={formData.dealerCode || 'CODE'}</span>.
            </p>
          </div>

          {/* Contact Details & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Login Email *</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  placeholder="dealer@agency.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Phone *</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Base City</Label>
              <Input
                placeholder="e.g. Surat, Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Initial Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Dealer Portal Temporary Password *</Label>
            <div className="relative">
              <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                required
                type="text"
                placeholder="Temporary Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-8 text-sm font-mono"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Provide these credentials to the dealer so they can log in at <span className="font-mono">/dealer</span>.
            </p>
          </div>

          {/* Commercial Terms: Commission & First Payment Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>Lifetime Recurring Commission (%) *</span>
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
              <p className="text-[10px] text-muted-foreground">
                Earned on every paid subscription transaction (initial + renewals + add-ons) for studios referred by this dealer.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>First-Payment Studio Discount (%) *</span>
              </div>
              <Input
                required
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.firstPaymentDiscountPercent}
                onChange={(e) =>
                  setFormData({ ...formData, firstPaymentDiscountPercent: parseFloat(e.target.value) || 0 })
                }
                className="text-sm font-bold bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Instant discount applied strictly once to the studio&apos;s first payment. All future renewals charge standard rate.
              </p>
            </div>
          </div>

          {/* Bank / Settlement Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Settlement &amp; Bank Details (Optional)</span>
            </div>
            <Textarea
              rows={2}
              placeholder="e.g. HDFC Bank, A/C: 501002345678, IFSC: HDFC0000123, UPI: dealer@okaxis"
              value={formData.bankDetails}
              onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Provisioning Dealer...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Dealer Account</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
