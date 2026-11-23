import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Clock, User } from 'lucide-react';
import { Badge } from '@/components/badges/Badge';
import { Button } from '@/components/buttons/Button';
import type { RevisionRecord } from './types';

interface RevisionCardProps {
  revision: RevisionRecord;
  onView?: (id: string) => void;
  onRestore?: (id: string) => void;
  className?: string;
}

export function RevisionCard({ revision, onView, onRestore, className }: RevisionCardProps) {
  return (
    <div className={cn("p-4 border rounded-md flex flex-col gap-4 bg-background hover:bg-muted/30 transition-colors", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">v{revision.version}</span>
              {revision.isCurrent && <Badge variant="success">Current</Badge>}
              {!revision.isCurrent && <Badge variant="neutral">{revision.status}</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span suppressHydrationWarning>{new Date(revision.createdAt).toLocaleString()}</span>
              <span className="px-1">•</span>
              <User className="h-3 w-3" />
              <span>{revision.createdBy.name}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(revision.id)}>View Details</Button>
          )}
          {onRestore && !revision.isCurrent && (
            <Button variant="primary" size="sm" onClick={() => onRestore(revision.id)}>Restore</Button>
          )}
        </div>
      </div>
      
      {revision.reason && (
        <div className="text-sm bg-muted/40 p-3 rounded-md text-muted-foreground border">
          <span className="font-medium text-foreground mr-2">Reason:</span>
          {revision.reason}
        </div>
      )}
    </div>
  );
}
