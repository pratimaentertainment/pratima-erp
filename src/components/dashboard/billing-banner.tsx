import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getBillingBannerDataAction } from '@/actions/billing-banner.actions';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export async function BillingBanner() {
  // Server-side data fetching with strict RBAC validation
  const data = await getBillingBannerDataAction();

  // If user is not TENANT_OWNER or subscription is not expiring within 15 days, render nothing
  if (!data) {
    return null;
  }

  const {
    daysRemaining,
    isExpired,
    isUrgent,
    isTrial,
    planName,
    expiryDateFormatted,
  } = data;

  const title = isExpired
    ? isTrial
      ? 'Free Trial Expired'
      : 'Subscription Expired'
    : isUrgent
      ? 'Immediate Attention Required'
      : isTrial
        ? 'Trial Expiring Soon'
        : 'Subscription Renewal Notice';

  let description = '';
  if (isExpired) {
    description = isTrial
      ? 'Your 15-day free studio trial has ended. Upgrade to a paid plan to restore full client proofing, shoot scheduling, and team features.'
      : `Your ${planName ? `"${planName}" ` : ''}subscription is expired. Settle your billing to prevent service interruption across all branches.`;
  } else if (isTrial) {
    description = `Your 15-day free trial expires in ${daysRemaining} ${
      daysRemaining === 1 ? 'day' : 'days'
    } (${expiryDateFormatted}). Upgrade now to lock in current pricing and ensure seamless studio workflows.`;
  } else {
    description = `Your ${planName ? `"${planName}" ` : ''}plan expires in ${daysRemaining} ${
      daysRemaining === 1 ? 'day' : 'days'
    } (${expiryDateFormatted}). Renew today to keep your studio quotas active.`;
  }

  return (
    <aside
      aria-label="Billing Alert Banner"
      className={cn(
        'w-full border-b transition-colors px-4 py-2.5 sm:px-6 sm:py-3 z-30',
        isUrgent
          ? 'bg-destructive/10 border-destructive/30 text-destructive-foreground dark:bg-destructive/20 dark:border-destructive/40'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 dark:bg-amber-950/40 dark:border-amber-500/30'
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Icon & Message */}
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0',
              isUrgent
                ? 'bg-destructive/20 text-destructive dark:bg-destructive/40 dark:text-red-300'
                : 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300'
            )}
          >
            {isExpired ? (
              <ShieldAlert className="h-4 w-4" />
            ) : isUrgent ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  isUrgent
                    ? 'text-destructive dark:text-red-400'
                    : 'text-amber-800 dark:text-amber-400'
                )}
              >
                {title}
              </span>
              {!isExpired && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded font-mono font-bold',
                    isUrgent
                      ? 'bg-destructive/20 text-destructive dark:text-red-300'
                      : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                  )}
                >
                  {daysRemaining} {daysRemaining === 1 ? 'day left' : 'days left'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {description}
            </p>
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({
                size: 'sm',
                variant: isUrgent ? 'destructive' : 'default',
              }),
              'text-xs font-semibold gap-1.5 shadow-xs h-8'
            )}
          >
            <span>{isExpired ? 'Renew Access' : 'Upgrade Plan'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
