import * as React from 'react';
import { Trash2, Copy, GripVertical } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';
import { TextInput } from '@/components/inputs/TextInput';
import { CurrencyInput, PercentageInput, MoneyDisplay } from '@/components/finance';
import type { LineItemBase } from './types';

interface LineItemRowProps<T extends LineItemBase> {
  item: T;
  index: number;
  currency: string;
  onUpdate: (id: string, updates: Partial<T>) => void;
  onRemove: (id: string) => void;
  onDuplicate?: (id: string) => void;
  readOnly?: boolean;
}

export function LineItemRow<T extends LineItemBase>({
  item,
  index,
  currency,
  onUpdate,
  onRemove,
  onDuplicate,
  readOnly = false,
}: LineItemRowProps<T>) {
  return (
    <div className="grid grid-cols-12 gap-4 py-3 border-b border-border/50 last:border-0 items-start group hover:bg-muted/30 transition-colors px-2 -mx-2 rounded-md">
      <div className="col-span-1 flex items-center h-10 text-sm text-muted-foreground gap-2">
        {!readOnly && (
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <span>{index + 1}</span>
      </div>
      
      <div className="col-span-3 space-y-2">
        <TextInput
          placeholder="Product / Service Name"
          value={item.productName ?? ''}
          onChange={(e) => onUpdate(item.id, { productName: e.target.value } as Partial<T>)}
          disabled={readOnly}
        />
        <TextInput
          placeholder="Description (optional)"
          value={item.description || ''}
          onChange={(e) => onUpdate(item.id, { description: e.target.value } as Partial<T>)}
          disabled={readOnly}
          className="text-sm text-muted-foreground"
        />
      </div>

      <div className="col-span-1">
        <TextInput
          type="number"
          min="1"
          value={(item.quantity ?? 1).toString()}
          onChange={(e) => onUpdate(item.id, { quantity: Number(e.target.value) } as Partial<T>)}
          disabled={readOnly}
        />
      </div>

      <div className="col-span-2">
        <CurrencyInput
          currencySymbol={currency}
          value={(item.unitPrice ?? 0).toString()}
          onChange={(e) => onUpdate(item.id, { unitPrice: Number(e.target.value) } as Partial<T>)}
          disabled={readOnly}
        />
      </div>

      <div className="col-span-1">
        <PercentageInput
          value={(item.tax ?? 0).toString()}
          onChange={(e) => onUpdate(item.id, { tax: Number(e.target.value) } as Partial<T>)}
          disabled={readOnly}
        />
      </div>
      
      <div className="col-span-1">
        <CurrencyInput
          currencySymbol={currency}
          value={(item.discount ?? 0).toString()}
          onChange={(e) => onUpdate(item.id, { discount: Number(e.target.value) } as Partial<T>)}
          disabled={readOnly}
        />
      </div>

      <div className="col-span-2 flex items-center h-10 justify-end">
        <MoneyDisplay amount={item.total ?? (Number(item.quantity || 1) * Number(item.unitPrice || 0))} currency={currency} className="font-bold" />
      </div>

      <div className="col-span-1 flex items-center h-10 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {!readOnly && (
          <div className="flex items-center gap-1">
            {onDuplicate && (
              <IconButton variant="ghost" size="sm" icon={<Copy className="h-4 w-4" />} onClick={() => onDuplicate(item.id)} aria-label="Duplicate item" />
            )}
            <IconButton variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => onRemove(item.id)} className="text-danger hover:text-danger hover:bg-danger/10" aria-label="Remove item" />
          </div>
        )}
      </div>
    </div>
  );
}
