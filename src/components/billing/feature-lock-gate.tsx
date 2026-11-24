import * as React from 'react';
import Link from 'next/link';
import {
  Lock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PlanFeatureKey,
  getFeatureDefinition,
} from '@/lib/constants/plan-features';
import { cn } from '@/lib/utils';

export interface FeatureLockGateProps {
  featureKey: PlanFeatureKey;
  isUnlocked?: boolean;
  children: React.ReactNode;
  fallbackMode?: 'page' | 'card' | 'inline';
  customTitle?: string;
  customDescription?: string;
}

export function FeatureLockGate({
  featureKey,
  isUnlocked = false,
  children,
  fallbackMode = 'page',
  customTitle,
  customDescription,
}: FeatureLockGateProps) {
  if (isUnlocked) {
    return <>{children}</>;
  }

  const featureDef = getFeatureDefinition(featureKey);
  const title = customTitle || featureDef?.label || 'Premium Feature Locked';
  const description =
    customDescription ||
    featureDef?.description ||
    'This feature is reserved for higher-tier subscription plans. Upgrade your studio account to unlock immediate access.';
  const recommendedTier = featureDef?.recommendedTier || 'Pro Studio';

  if (fallbackMode === 'inline') {
    return (
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{title}</span>
            <span className="text-muted-foreground ml-1.5 hidden sm:inline">
              (Requires {recommendedTier})
            </span>
          </div>
        </div>
        <Link
          href="/settings/billing"
          className={cn(
            buttonVariants({ size: 'xs', variant: 'default' }),
            'h-7 text-[11px] gap-1 shrink-0 inline-flex items-center justify-center'
          )}
        >
          <span>Upgrade</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  if (fallbackMode === 'card') {
    return (
      <Card className="border-border/60 bg-card/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3">
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5 uppercase font-mono">
            {recommendedTier} Required
          </Badge>
        </div>
        <CardHeader className="p-6">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold font-heading">{title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="p-6 pt-0">
          <Link
            href="/settings/billing"
            className={cn(
              buttonVariants({ size: 'sm', variant: 'default' }),
              'w-full text-xs gap-1.5 inline-flex items-center justify-center'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Upgrade to {recommendedTier}</span>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Full Page Gate
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/80 bg-card shadow-lg text-center p-6 space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-inner">
          <Lock className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-600 text-[11px] font-medium font-mono uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            <span>Available on {recommendedTier}</span>
          </div>
          <h2 className="text-2xl font-black font-heading tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-left text-xs space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            <span>Included in {recommendedTier}:</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-snug">
            Gain immediate access to {featureDef?.label || 'this module'}, increased branch quotas, and scalable crew allocations.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full sm:w-auto text-xs inline-flex items-center justify-center'
            )}
          >
            Back to Dashboard
          </Link>
          <Link
            href="/settings/billing"
            className={cn(
              buttonVariants({ variant: 'default' }),
              'w-full sm:flex-1 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 inline-flex items-center justify-center'
            )}
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
