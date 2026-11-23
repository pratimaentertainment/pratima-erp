'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[50vh] text-muted-foreground gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

export function SkeletonLoader({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}
