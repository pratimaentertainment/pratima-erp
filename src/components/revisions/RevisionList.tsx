import * as React from 'react';
import { cn } from '@/lib/utils';
import { RevisionCard } from './RevisionCard';
import type { RevisionRecord } from './types';

interface RevisionListProps {
  revisions: RevisionRecord[];
  onView?: (id: string) => void;
  onRestore?: (id: string) => void;
  className?: string;
}

export function RevisionList({ revisions, onView, onRestore, className }: RevisionListProps) {
  if (!revisions || revisions.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-md">No revisions found.</div>;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {revisions.map((rev) => (
        <RevisionCard
          key={rev.id}
          revision={rev}
          onView={onView}
          onRestore={onRestore}
        />
      ))}
    </div>
  );
}
