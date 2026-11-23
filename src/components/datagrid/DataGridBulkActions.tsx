'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/buttons/Button';
import type { BulkAction } from './types';
import { AnimatePresence, motion } from 'framer-motion';

interface DataGridBulkActionsProps<TData> {
  table: Table<TData>;
  actions: BulkAction<TData>[];
}

export function DataGridBulkActions<TData>({ table, actions }: DataGridBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  
  if (actions.length === 0) return null;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 p-2 px-4 rounded-md bg-muted/50 border shadow-sm"
        >
          <span className="text-sm font-medium mr-2">{selectedCount} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          {actions.map((action) => {
            const isVisible = action.show ? action.show(selectedRows.map(r => r.original)) : true;
            if (!isVisible) return null;
            
            return (
              <Button
                key={action.id}
                variant={action.isDestructive ? "destructive" : "outline"}
                size="sm"
                onClick={() => action.onClick(selectedRows.map(r => r.original))}
                className="h-7 text-xs"
              >
                {action.icon && <span className="mr-1.5 h-3.5 w-3.5">{action.icon}</span>}
                {action.label}
              </Button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
