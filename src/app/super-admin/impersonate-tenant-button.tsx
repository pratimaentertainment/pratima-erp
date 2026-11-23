'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startTenantImpersonationAction } from '@/actions/impersonation.actions';
import { toast } from 'sonner';

interface ImpersonateTenantButtonProps {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

export function ImpersonateTenantButton({
  tenantId,
  tenantName,
  tenantSlug,
}: ImpersonateTenantButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleImpersonate = () => {
    const confirmed = window.confirm(
      `Start a 15-minute audited support session to inspect "${tenantName}" (/${tenantSlug})?\n\nAll support activities will be logged with your administrator identity.`
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const res = await startTenantImpersonationAction(tenantId);
        if (res.success) {
          toast.success(`Support Mode activated for "${tenantName}". Redirecting to dashboard...`);
          window.location.href = res.redirectUrl || '/dashboard';
        } else {
          toast.error(res.error || 'Failed to start support session.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred while starting impersonation.');
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleImpersonate}
      disabled={isPending}
      className="h-7 px-2 text-xs gap-1 font-medium text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
      title={`Login as ${tenantName} (Audited 15-Minute Support Session)`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400" />
      ) : (
        <LogIn className="h-3 w-3 text-amber-600 dark:text-amber-400" />
      )}
      <span>Login as Studio</span>
    </Button>
  );
}
