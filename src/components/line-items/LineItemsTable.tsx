import * as React from 'react';
import { LineItemRow } from './LineItemRow';
import { LineItemActions } from './LineItemActions';
import { LineItemColumns } from './LineItemColumns';
import { cn } from '@/lib/utils';
import type { LineItemBase } from './types';

interface LineItemsTableProps<T extends LineItemBase> {
  items: T[];
  currency?: string;
  readOnly?: boolean;
  onUpdate: (id: string, updates: Partial<T>) => void;
  onRemove: (id: string) => void;
  onAddBlankItem: () => void;
  onDuplicate?: (id: string) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
}

export function LineItemsTable<T extends LineItemBase>({
  items,
  currency = 'USD',
  readOnly = false,
  onUpdate,
  onRemove,
  onAddBlankItem,
  onDuplicate,
  onMove,
}: LineItemsTableProps<T>) {
  return (
    <div className="w-full space-y-4">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground px-2">
        {LineItemColumns.map((col) => (
          <div key={col.id} className={cn(col.className)}>{col.label}</div>
        ))}
      </div>

      {/* Table Body */}
      <div className="flex flex-col gap-1">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border-b border-dashed border-border/50">
            No line items added.
          </div>
        ) : (
          items.map((item, index) => (
            <LineItemRow
              key={item.id}
              item={item}
              index={index}
              currency={currency}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      <LineItemActions onAddBlankItem={onAddBlankItem} readOnly={readOnly} />
    </div>
  );
}
