'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sparkles, ArrowRight, Layers, Users, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UpgradePlanModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  requiredTier?: string;
  limitType?: 'branch' | 'branches' | 'staff' | 'feature';
  currentLimit?: number;
  featureName?: string;
}

export function UpgradePlanModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  requiredTier,
  limitType = 'feature',
  currentLimit,
  featureName,
}: UpgradePlanModalProps) {
  const isModalOpen = Boolean(open ?? isOpen ?? false);
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const isBranchLimit = limitType === 'branch' || limitType === 'branches';

  const defaultTitle = isBranchLimit
    ? 'Branch Limit Reached'
    : limitType === 'staff'
    ? 'Team Member Quota Exceeded'
    : 'Premium Feature Locked';

  const defaultDescription = isBranchLimit
    ? `Your current subscription plan allows up to ${currentLimit || 1} active ${
        (currentLimit || 1) === 1 ? 'branch' : 'branches'
      }. Upgrade to ${requiredTier || 'Pro Studio or Enterprise Franchise'} to scale your studio across multiple cities.`
    : limitType === 'staff'
    ? `You have reached your staff account quota of ${currentLimit || 3} members. Upgrade to ${requiredTier || 'Pro Studio'} to add more photographers, editors, and branch managers.`
    : `The feature "${featureName || 'this module'}" is a premium capability available on ${requiredTier || 'Pro Studio or Enterprise Franchise'} tiers.`;

  return (
    <Dialog open={isModalOpen} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            {isBranchLimit ? (
              <GitBranch className="h-6 w-6" />
            ) : limitType === 'staff' ? (
              <Users className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </div>
          <div className="text-center space-y-1">
            <DialogTitle className="text-xl font-bold font-heading">
              {title || defaultTitle}
            </DialogTitle>
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 text-[10px] uppercase font-mono">
              Tier Quota Guard
            </Badge>
          </div>
          <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Why Upgrade Pratima ERP?</span>
          </div>
          <ul className="space-y-1 text-muted-foreground pl-5 list-disc">
            <li>Instant multi-branch synchronization &amp; isolated inventories</li>
            <li>Unlimited crew rosters, attendance &amp; automatic salary slips</li>
            <li>Client proofing galleries with BYOS Google Drive &amp; S3 mirroring</li>
            <li>Inbound Meta Lead Ads direct CRM capture with zero lag</li>
          </ul>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto text-xs"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Link
            href="/settings/billing"
            onClick={handleClose}
            className={cn(
              buttonVariants({ variant: 'default' }),
              'w-full sm:flex-1 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 inline-flex items-center justify-center'
            )}
          >
            <span>View Plans &amp; Upgrade</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
