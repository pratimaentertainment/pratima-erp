'use client';

import * as React from 'react';
import { ConfirmDialog } from '@/components/dialogs';

export interface EntityArchiveDialogProps {
  entityName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isArchiving?: boolean;
}

export function EntityArchiveDialog({
  entityName,
  isOpen,
  onOpenChange,
  onConfirm,
  isArchiving
}: EntityArchiveDialogProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={`Archive ${entityName}`}
      description={`Are you sure you want to archive this ${entityName.toLowerCase()}? It will be hidden from the default views but can be restored later.`}
      confirmText="Archive"
      isDestructive={false}
      isConfirming={isArchiving}
      onConfirm={onConfirm}
      onCancel={() => onOpenChange(false)}
    />
  );
}
