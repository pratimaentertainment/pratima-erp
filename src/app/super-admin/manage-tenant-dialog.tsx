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
  Layers,
  IndianRupee,
  CreditCard,
  Zap,
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
  updateTenantAddonsAction,
  activateTenantPlanAndAddonsAction,
} from '@/actions/super-admin.actions';
import { Switch } from '@/components/ui/switch';
import { startTenantImpersonationAction } from '@/actions/impersonation.actions';
import { PLAN_FEATURES_CATALOG } from '@/lib/constants/plan-features';

export interface AvailablePlanItem {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  isBasePlan?: boolean;
}

export interface AvailableAddonItem {
  featureKey: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
}

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
    enabledAddons?: string[];
    currentPlanId?: string | null;
  };
  availablePlans?: AvailablePlanItem[];
  availableAddons?: AvailableAddonItem[];
}

export function ManageTenantDialog({
  studio,
  availablePlans = [],
  availableAddons = [],
}: ManageTenantDialogProps) {
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

  // Studio Add-ons state
  const [enabledAddons, setEnabledAddons] = useState<string[]>(studio.enabledAddons || []);

  // Plan Assignment State
  const defaultPlanId =
    studio.currentPlanId ||
    availablePlans.find((p) => p.isBasePlan)?.id ||
    availablePlans[0]?.id ||
    '';
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

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

  // Price calculations
  const selectedPlan = availablePlans.find((p) => p.id === selectedPlanId);
  const planRate = selectedPlan
    ? billingCycle === 'ANNUAL'
      ? selectedPlan.annualPrice
      : selectedPlan.monthlyPrice
    : 0;

  const addonsRate = enabledAddons.reduce((sum, key) => {
    const addon = availableAddons.find((a) => a.featureKey === key);
    if (!addon) return sum;
    return sum + (billingCycle === 'ANNUAL' ? addon.annualPrice : addon.monthlyPrice);
  }, 0);

  const subtotal = planRate + addonsRate;
  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = Math.round((subtotal + gst) * 100) / 100;

  const handleExtendTrial = (daysToAdd: number) => {
    startTransition(async () => {
      const res = await extendTenantTrialAction(studio.id, daysToAdd);
      if (res.success && res.data) {
        toast.success(res.message);
        setCurrentTrialEndsAt(res.data.trialEndsAt || null);
        setCurrentStatus(res.data.subscriptionStatus);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to extend trial');
      }
    });
  };

  const handleUpdateStatus = (status: string) => {
    startTransition(async () => {
      const res = await updateTenantStatusAction(studio.id, status);
      if (res.success && res.data) {
        toast.success(res.message);
        setCurrentStatus(res.data.subscriptionStatus);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update subscription status');
      }
    });
  };

  const handleResetPassword = () => {
    startTransition(async () => {
      const res = await resetTenantOwnerPasswordAction(studio.id);
      if (res.success && res.data) {
        toast.success(res.message);
        setResetResult(res.data);
      } else {
        toast.error(res.error || 'Failed to reset password');
      }
    });
  };

  const handleToggleAddon = (featureKey: string) => {
    const nextAddons = enabledAddons.includes(featureKey)
      ? enabledAddons.filter((k) => k !== featureKey)
      : [...enabledAddons, featureKey];

    setEnabledAddons(nextAddons);

    startTransition(async () => {
      const res = await updateTenantAddonsAction(studio.id, nextAddons);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update add-ons');
      }
    });
  };

  const handleActivatePlanAndAddons = () => {
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan first.');
      return;
    }

    startTransition(async () => {
      const res = await activateTenantPlanAndAddonsAction({
        tenantId: studio.id,
        planId: selectedPlanId,
        billingCycle,
        enabledAddons,
      });

      if (res.success) {
        toast.success(res.message || 'Plan and add-ons activated successfully.');
        setCurrentStatus('ACTIVE');
        setCurrentTrialEndsAt(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to activate plan and add-ons.');
      }
    });
  };

  const handleSaveFranchiseConfig = () => {
    startTransition(async () => {
      const numRate = parseFloat(royaltyPercent);
      const res = await updateTenantFranchiseConfigAction(studio.id, {
        isFranchisor,
        royaltyPercent: isNaN(numRate) ? null : numRate,
      });

      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update franchise config');
      }
    });
  };

  const handleCopyPassword = () => {
    if (resetResult?.temporaryPassword) {
      navigator.clipboard.writeText(resetResult.temporaryPassword);
      setCopied(true);
      toast.success('Temporary password copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleStartImpersonation = () => {
    startTransition(async () => {
      try {
        const res = await startTenantImpersonationAction(studio.id);
        if (res.success) {
          toast.success('Support Mode activated.');
          setOpen(false);
          window.location.href = res.redirectUrl || '/dashboard';
        } else {
          toast.error(res.error || 'Failed to start support session.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 hover:bg-muted"
            title={`Manage ${studio.name}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manage</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-bold font-heading">
              Manage Studio: {studio.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Slug: <code className="font-mono text-foreground font-semibold">{studio.slug}</code> • ID: {studio.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* SECTION 1: 1-CLICK PLAN & MODULAR ADD-ONS ACTIVATION (NEW IN PHASE 19) */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  Plan &amp; Modular Add-on Activation Desk
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Assign base SaaS tier, select individual add-on capabilities, and activate immediately.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                Instant Provisioning
              </Badge>
            </div>

            {/* Plan selection & billing cycle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Select Base SaaS Plan</Label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isBasePlan ? '(Base Plan)' : ''} — ₹{p.monthlyPrice}/mo (₹{p.annualPrice}/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Billing Cycle</Label>
                <div className="grid grid-cols-2 gap-2 h-9">
                  <Button
                    type="button"
                    size="sm"
                    variant={billingCycle === 'MONTHLY' ? 'default' : 'outline'}
                    onClick={() => setBillingCycle('MONTHLY')}
                    className="text-xs h-full"
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={billingCycle === 'ANNUAL' ? 'default' : 'outline'}
                    onClick={() => setBillingCycle('ANNUAL')}
                    className="text-xs h-full"
                  >
                    Annual (Save)
                  </Button>
                </div>
              </div>
            </div>

            {/* Configured Add-ons with live prices */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Select Modular Add-ons ({enabledAddons.length} selected)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Configured catalog rates
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {PLAN_FEATURES_CATALOG.map((f) => {
                  const isEnabled = enabledAddons.includes(f.key);
                  const addonPrice = availableAddons.find((a) => a.featureKey === f.key);
                  const rate = addonPrice
                    ? billingCycle === 'ANNUAL'
                      ? addonPrice.annualPrice
                      : addonPrice.monthlyPrice
                    : 0;

                  return (
                    <div
                      key={f.key}
                      onClick={() => handleToggleAddon(f.key)}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-card/40 border-border/50 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggleAddon(f.key)}
                        className="scale-75 origin-top-left mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs font-semibold leading-tight">
                          <span className="truncate">{f.label}</span>
                          <span className="text-[10px] font-mono text-primary ml-1 shrink-0">
                            +₹{rate.toLocaleString('en-IN')}/{billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {f.shortDescription}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time Calculated Total Summary */}
            <div className="p-3 rounded-lg border border-border/60 bg-background/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Base Plan ({selectedPlan?.name || 'Selected'}):</span>
                <span className="font-mono text-foreground font-medium">
                  ₹{planRate.toLocaleString('en-IN')}/{billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Modular Add-ons ({enabledAddons.length}):</span>
                <span className="font-mono text-foreground font-medium">
                  ₹{addonsRate.toLocaleString('en-IN')}/{billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono text-foreground">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18%):</span>
                <span className="font-mono text-foreground">
                  ₹{gst.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-bold text-sm text-foreground">
                <span>Total Billing:</span>
                <span className="font-mono text-primary text-base">
                  ₹{grandTotal.toLocaleString('en-IN')}/{billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleActivatePlanAndAddons}
                  disabled={isPending || !selectedPlanId}
                  className="gap-1.5 text-xs font-bold w-full sm:w-auto"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Activate Plan &amp; Add-ons Now</span>
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 2: SUBSCRIPTION LIFECYCLE & STATUS */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Subscription State Override
              </Label>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                  statusOptions.find((o) => o.value === currentStatus)?.color || ''
                }`}
              >
                {currentStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {statusOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={currentStatus === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUpdateStatus(opt.value)}
                  disabled={isPending}
                  className="h-8 text-xs font-semibold"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* SECTION 3: TRIAL EXTENSION DESK */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Trial Expiration Extension
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Extends trial timestamp and lifts any hard lock screen.
                </p>
              </div>

              {currentTrialEndsAt && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Expires On</span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {new Date(currentTrialEndsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(7)}
                disabled={isPending}
                className="h-8 text-xs font-medium"
              >
                +7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(15)}
                disabled={isPending}
                className="h-8 text-xs font-medium"
              >
                +15 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExtendTrial(30)}
                disabled={isPending}
                className="h-8 text-xs font-medium"
              >
                +30 Days (1 Month)
              </Button>

              <div className="flex items-center gap-1 ml-auto">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="h-8 w-16 text-xs font-mono text-center"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const parsed = parseInt(customDays, 10);
                    if (!isNaN(parsed) && parsed > 0) handleExtendTrial(parsed);
                  }}
                  disabled={isPending}
                  className="h-8 text-xs font-medium"
                >
                  Extend
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 4: OWNER PASSWORD RECOVERY */}
          <div className="pt-2 border-t space-y-3">
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
              </div>
            )}
          </div>

          {/* SECTION 5: SUPPORT IMPERSONATION */}
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

          {/* SECTION 6: FRANCHISE NETWORK GOVERNANCE */}
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
