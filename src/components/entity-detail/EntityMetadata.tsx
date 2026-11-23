import * as React from 'react';
import { cn } from '@/lib/utils';
import type { EntityMetadataItem } from './types';

interface EntityMetadataProps {
  items: EntityMetadataItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function EntityMetadata({ items, columns = 2, className }: EntityMetadataProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }[columns];

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {items.map((item) => (
        <div key={item.id} className={cn("flex flex-col gap-1", item.fullWidth && "col-span-full")}>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
            {item.label}
          </div>
          <div className="text-sm">
            {item.value || <span className="text-muted-foreground/50">-</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
