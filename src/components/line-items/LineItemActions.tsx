import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/buttons/Button';

interface LineItemActionsProps {
  onAddBlankItem: () => void;
  readOnly?: boolean;
}

export function LineItemActions({ onAddBlankItem, readOnly = false }: LineItemActionsProps) {
  if (readOnly) return null;
  
  return (
    <div className="flex justify-start pt-2">
      <Button variant="outline" size="sm" onClick={onAddBlankItem}>
        <Plus className="mr-2 h-4 w-4" />
        Add Line Item
      </Button>
    </div>
  );
}
