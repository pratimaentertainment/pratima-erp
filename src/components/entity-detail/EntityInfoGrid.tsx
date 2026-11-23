import * as React from 'react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/cards';

interface EntityInfoGridProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function EntityInfoGrid({ title, children, className }: EntityInfoGridProps) {
  return (
    <ContentCard className={cn("w-full", className)}>
      {title && (
        <div className="mb-4 pb-2 border-b text-sm font-medium">
          {title}
        </div>
      )}
      {children}
    </ContentCard>
  );
}
