import * as React from 'react';
import { cn } from '@/lib/utils';

interface EntityEditFormProps {
  children: React.ReactNode;
  className?: string;
}

export function EntityEditForm({ children, className }: EntityEditFormProps) {
  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      {children}
    </div>
  );
}
