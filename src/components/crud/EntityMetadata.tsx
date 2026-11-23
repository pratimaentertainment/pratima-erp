import * as React from 'react';
import { ContentCard } from '@/components/cards';

export interface EntityMetadataProps {
  items: { label: string; value: React.ReactNode }[];
}

export function EntityMetadata({ items }: EntityMetadataProps) {
  return (
    <ContentCard>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="text-sm text-muted-foreground">{item.label}</div>
            <div className="font-medium">{item.value || '-'}</div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
