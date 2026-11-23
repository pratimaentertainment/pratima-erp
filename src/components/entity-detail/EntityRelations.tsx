import * as React from 'react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/cards';
import { LinkIcon, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export interface EntityRelation {
  id: string;
  type: string; // e.g. "Customer", "Project", "Invoice"
  label: string;
  href: string;
  status?: string;
}

interface EntityRelationsProps {
  title?: string;
  relations: EntityRelation[];
  className?: string;
}

export function EntityRelations({ title = "Related Records", relations, className }: EntityRelationsProps) {
  return (
    <ContentCard className={cn("w-full", className)}>
      <div className="mb-4 pb-2 border-b text-sm font-medium flex items-center gap-2">
        <LinkIcon className="h-4 w-4" />
        {title}
      </div>
      
      {relations.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No related records found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {relations.map((relation) => (
            <Link 
              key={relation.id} 
              href={relation.href}
              className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/30 transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{relation.type}</span>
                <span className="text-sm font-medium text-primary group-hover:underline">{relation.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {relation.status && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {relation.status}
                  </span>
                )}
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </ContentCard>
  );
}
