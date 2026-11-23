'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  SlidersHorizontal,
  Calendar,
  Clock,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Lock,
  LogIn,
  Network,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  extendTenantTrialAction,
  updateTenantStatusAction,
  resetTenantOwnerPasswordAction,
  updateTenantFranchiseConfigAction,
} from '@/actions/super-admin.actions';
import { Switch } from '@/components/ui/switch';
import { startTenantImpersonationAction } from '@/actions/impersonation.actions';

interface ManageTenantDialogProps {
  studio: {
    id: string;
    name: string;
    slug: string;
    contactPhone?: string | null;
    email?: string | null;
    subscriptionStatus: string;
    trialEndsAt?: Date | string | null;
    isFranchisor?: boolean;
    parentTenantId?: string | null;
    royaltyPercent?: any;
  };
}

export function ManageTenantDialog({ studio }: ManageTenantDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Local state for instant feedback
  const [currentStatus, setCurrentStatus] = useState(studio.subscriptionStatus);
  const [currentTrialEndsAt, setCurrentTrialEndsAt] = useState<string | null>(
    studio.trialEndsAt ? new Date(studio.trialEndsAt).toISOString() : null
  );

  // Custom extension days
  const [customDays, setCustomDays] = useState('7');

  // Franchise configuration states
  const [isFranchisor, setIsFranchisor] = useState(Boolean(studio.isFranchisor));
  const [royaltyPercent, setRoyaltyPercent] = useState(
    studio.royaltyPercent ? String(Number(studio.royaltyPercent)) : '10'
  );

  // Reset password results
  const [resetResult, setResetResult] = useState<{
    ownerEmail: string;
    ownerName: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Status mapping
  const statusOptions = [
    { value: 'ACTIVE', label: 'Active', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' },
    { value: 'TRIAL', label: 'Trial Mode', color: 'text-amber-700 bg-amber-500/10 border-amber-500/30' },
    { value: 'PAST_DUE', label: 'Past Due', color: 'text-rose-700 bg-rose-500/10 border-rose-500/30' },
    { value: 'CANCELLED', label: 'Cancelled / Suspended', color: 'text-red-700 bg-red-500/10 border-red-500/30' },
  ];

  const handleExtendTrial = (daysToAdd: number) => {
    startTransition(async () => {
      const res = await extendTenantTrialAction(studio.id, daysToAdd);
      if (res.success && res.data) {
        toast.success(res.message);
        setCurrentTrialEndsAt(res.data.trialEndsAt || null);
        setCurrentStatus(res.data.subscriptionStatus);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to extend trial.');
      }
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateTenantStatusAction(studio.id, newStatus);
      if (res.success && res.data) {
        toast.success(res.message);
        setCurrentStatus(res.data.subscriptionStatus);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    });
  };

  const handleResetPassword = () => {
    if (!window.confirm(`Are you sure you want to generate a new temporary password for ${studio.name}'s owner?`)) {
      return;
    }

    startTransition(async () => {
      const res = await resetTenantOwnerPasswordAction(studio.id);
      if (res.success && res.data) {
        toast.success(res.message);
        setResetResult(res.data);
      } else {
        toast.error(res.error || 'Failed to reset password.');
      }
    });
  };

  const handleCopyPassword = () => {
    if (!resetResult?.temporaryPassword) return;
    navigator.clipboard.writeText(resetResult.temporaryPassword);
    setCopied(true);
    toast.success('Temporary password copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartImpersonation = () => {
    if (
      !window.confirm(
        `Start a 15-minute audited support session to inspect "${studio.name}"?\n\nAll support activities will be logged with your administrator identity.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await startTenantImpersonationAction(studio.id);
      if (res.success) {
        toast.success(`Support Mode activated for "${studio.name}". Redirecting...`);
        window.location.href = res.redirectUrl || '/dashboard';
      } else {
        toast.error(res.error || 'Failed to start support session.');
      }
    });
  };

  const handleSaveFranchiseConfig = () => {
    startTransition(async () => {
      try {
        const parsedRoyalty = parseFloat(royaltyPercent);
        const res = await updateTenantFranchiseConfigAction(studio.id, {
          isFranchisor,
          royaltyPercent: isNaN(parsedRoyalty) ? null : parsedRoyalty,
        });

        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to update franchise settings.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred updating franchise settings.');
      }
    });
  };

  const isExpired = currentTrialEndsAt && new Date(currentTrialEndsAt) < new Date();
  const trialFormatted = currentTrialEndsAt
    ? new Date(currentTrialEndsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'No trial date set';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 font-medium hover:bg-muted"
            title="Manage Studio Governance"
          >
            <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
            <span>Manage</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-muted/30 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-base font-bold font-heading text-foreground">
                {studio.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  /{studio.slug}
                </code>
                {studio.contactPhone && (
                  <span className="text-xs text-muted-foreground">&bull; {studio.contactPhone}</span>
                )}
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono tracking-wider font-semibold"
            >
              {currentStatus}
            </Badge>
          </div>
        </div>

        {/* Governance Controls */}
        <div className="p-6 space-y-6 text-xs">
          {/* SECTION 1: TRIAL DURATION EXTENSION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Trial Extension
              </Label>
              <div className="text-xs font-medium">
                Current Expiry:{' '}
                <span className={isExpired ? 'text-rose-500 font-bold' : 'font-semibold text-foreground'}>
                  {trialFormatted}
                </span>
                {isExpired && ' (Expired)'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(7)}
                disabled={isPending}
                className="h-8 text-xs font-semibold gap-1 hover:border-primary/40"
              >
                +7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(14)}
                disabled={isPending}
                className="h-8 text-xs font-semibold gap-1 hover:border-primary/40"
              >
                +14 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(30)}
                disabled={isPending}
                className="h-8 text-xs font-semibold gap-1 hover:border-primary/40"
              >
                +30 Days
              </Button>

              <div className="flex items-center gap-1.5 ml-auto">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-16 h-8 text-xs text-center"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const days = parseInt(customDays, 10);
                    if (!isNaN(days) && days > 0) handleExtendTrial(days);
                  }}
                  disabled={isPending}
                  className="h-8 text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 2: SUBSCRIPTION STATUS GOVERNANCE */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Subscription Status (Soft-Lock / Activation)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Changing status to Past Due or Cancelled immediately invokes the layout Hard Lock screen without deleting studio data.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleUpdateStatus(opt.value)}
                  disabled={isPending || currentStatus === opt.value}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    currentStatus === opt.value
                      ? `${opt.color} ring-2 ring-primary/30 font-bold`
                      : 'border-border/70 hover:bg-muted/40 text-muted-foreground font-medium'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  {currentStatus === opt.value && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: OWNER PASSWORD RESET */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  Owner Password Recovery
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generates a secure temporary password for the studio&apos;s primary administrator.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={isPending}
                className="h-8 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30"
              >
                Reset Password
              </Button>
            </div>

            {/* Display Generated Temporary Password */}
            {resetResult && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">
                    Owner: {resetResult.ownerName} ({resetResult.ownerEmail})
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Temporary
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-lg bg-background border font-mono text-xs font-bold text-foreground">
                    {resetResult.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPassword}
                    className="h-8 text-xs gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Provide this password to the studio owner. They will be able to sign in immediately and update their password in Profile Settings.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: SUPPORT IMPERSONATION */}
          <div className="pt-2 border-t space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              Support Impersonation Engine
            </Label>

            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Live Workspace Inspection
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Inspect this studio's operations, bookings, and CRM with live client eyes without knowing or resetting their password. 15-minute time-bound access with full compliance audit logging.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleStartImpersonation}
                disabled={isPending}
                className="h-8 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/15 shrink-0 gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Login as Studio</span>
              </Button>
            </div>
          </div>

          {/* SECTION 5: FRANCHISE NETWORK GOVERNANCE */}
          <div className="pt-2 border-t space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-primary" />
              Franchise Network Governance
            </Label>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Master Franchisor Mode
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Grants franchise provisioning and auto-royalty network desk to this studio.
                  </p>
                </div>
                <Switch
                  checked={isFranchisor}
                  onCheckedChange={setIsFranchisor}
                />
              </div>

              {isFranchisor && (
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="royaltyRateInput" className="text-xs font-medium">
                      Default Network Royalty Rate (%)
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Applied to newly provisioned franchisee studios.
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      id="royaltyRateInput"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={royaltyPercent}
                      onChange={(e) => setRoyaltyPercent(e.target.value)}
                      className="text-xs h-8 font-mono text-right"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveFranchiseConfig}
                  disabled={isPending}
                  className="h-7 text-xs font-semibold gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span>Save Franchise Config</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
