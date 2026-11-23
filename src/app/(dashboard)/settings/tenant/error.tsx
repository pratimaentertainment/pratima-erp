'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TenantSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[TenantSettingsError] Unhandled error caught by route boundary:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-8 max-w-xl mx-auto min-h-[50vh]">
      <Card className="border-destructive/30 bg-destructive/5 shadow-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-foreground">Unable to Load Tenant Profile</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            An unexpected error occurred while fetching your studio organization data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2 text-center">
          {error?.message && (
            <div className="p-3 bg-background rounded-lg border border-destructive/20 text-xs font-mono text-destructive/90 max-h-24 overflow-y-auto text-left">
              {error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => reset()}
              variant="default"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto inline-flex items-center justify-center')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
