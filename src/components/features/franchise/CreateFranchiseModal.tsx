'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Percent,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createFranchiseSchema,
  type CreateFranchiseInput,
} from '@/schemas/franchise.schema';
import { createFranchiseAction } from '@/actions/franchise.actions';

export function CreateFranchiseModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<{
    franchiseId: string;
    name: string;
    slug: string;
    ownerEmail: string;
    temporaryPassword: string;
  } | null>(null);

  const [hasCopied, setHasCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFranchiseInput>({
    resolver: zodResolver(createFranchiseSchema) as any,
    defaultValues: {
      name: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      city: '',
      state: '',
      address: '',
      royaltyPercent: 10,
    },
  });

  const onSubmit = (values: CreateFranchiseInput) => {
    setFormError(null);
    startTransition(async () => {
      try {
        const res = await createFranchiseAction(values);
        if (res.success && res.data) {
          toast.success(res.message);
          setCreatedData(res.data);
          router.refresh();
        } else {
          setFormError(res.error || 'Failed to create franchise studio.');
          toast.error(res.error || 'Failed to create franchise studio.');
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const copyCredentials = () => {
    if (!createdData) return;
    const text = `FRAMIQ Franchise Studio Account:\nStudio: ${createdData.name}\nLogin Email: ${createdData.ownerEmail}\nTemporary Password: ${createdData.temporaryPassword}\nLogin Portal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setHasCopied(false), 2500);
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedData(null);
    setFormError(null);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 font-semibold shadow-xs">
            <PlusCircle className="h-4 w-4" />
            <span>Add Franchise Studio</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-heading">
                {createdData ? 'Franchise Studio Created' : 'Provision New Franchise Studio'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {createdData
                  ? 'Share the temporary credentials below with the new studio owner.'
                  : 'Add a new franchisee studio to your network. Access is inherited from your plan.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {createdData ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{createdData.name} is ready for operations!</span>
              </div>
              <p className="text-xs text-muted-foreground">
                A primary headquarters branch and tenant owner user account have been created. The software fee is automatically billed under your Flexi-Billing tier.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span>Studio Owner Login Credentials</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyCredentials}
                  className="h-7 text-xs gap-1.5"
                >
                  {hasCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold text-foreground">{createdData.ownerEmail}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-semibold text-foreground">{createdData.temporaryPassword}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="button" onClick={handleClose} className="text-xs">
                Close & Return
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Studio Identity */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>Franchise Studio Name *</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Pratima Studios Pune North"
                  className="text-xs h-9"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-[11px] text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Owner Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ownerName" className="text-xs font-semibold flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>Owner Full Name *</span>
                </Label>
                <Input
                  id="ownerName"
                  placeholder="e.g. Rajesh Patil"
                  className="text-xs h-9"
                  {...register('ownerName')}
                />
                {errors.ownerName && (
                  <p className="text-[11px] text-destructive">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="ownerPhone" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>Owner Mobile Number *</span>
                </Label>
                <Input
                  id="ownerPhone"
                  placeholder="e.g. 9876543210"
                  className="text-xs h-9"
                  {...register('ownerPhone')}
                />
                {errors.ownerPhone && (
                  <p className="text-[11px] text-destructive">{errors.ownerPhone.message}</p>
                )}
              </div>
            </div>

            {/* Owner Email & Royalty % */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ownerEmail" className="text-xs font-semibold flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>Owner Login Email *</span>
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@pune-branch.com"
                  className="text-xs h-9"
                  {...register('ownerEmail')}
                />
                {errors.ownerEmail && (
                  <p className="text-[11px] text-destructive">{errors.ownerEmail.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="royaltyPercent" className="text-xs font-semibold flex items-center gap-1">
                  <Percent className="h-3 w-3 text-primary" />
                  <span>Franchisor Royalty Rate (%) *</span>
                </Label>
                <Input
                  id="royaltyPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="10"
                  className="text-xs h-9"
                  {...register('royaltyPercent')}
                />
                {errors.royaltyPercent && (
                  <p className="text-[11px] text-destructive">{errors.royaltyPercent.message}</p>
                )}
              </div>
            </div>

            {/* Location: City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs font-semibold flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>City *</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Pune"
                  className="text-xs h-9"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-[11px] text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="state" className="text-xs font-semibold">
                  <span>State *</span>
                </Label>
                <Input
                  id="state"
                  placeholder="e.g. Maharashtra"
                  className="text-xs h-9"
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-[11px] text-destructive">{errors.state.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-semibold">
                <span>Street / Studio Address</span>
              </Label>
              <Input
                id="address"
                placeholder="Shop 12, Phoenix Complex, FC Road"
                className="text-xs h-9"
                {...register('address')}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="text-xs gap-1.5 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Provisioning Studio...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Create Franchise</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
