'use client';

import * as React from 'react';
import { ConfirmDialog } from '@/components/dialogs';

export interface EntityDeleteDialogProps {
  entityName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function EntityDeleteDialog({
  entityName,
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting
}: EntityDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={`Delete ${entityName}`}
      description={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
      confirmText="Delete"
      isDestructive={true}
      isConfirming={isDeleting}
      onConfirm={onConfirm}
      onCancel={() => onOpenChange(false)}
    />
  );
}
