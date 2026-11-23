'use client';

import * as React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteTenantAction } from '@/actions/super-admin.actions';

interface DeleteTenantButtonProps {
  tenantId: string;
  tenantName: string;
}

export function DeleteTenantButton({ tenantId, tenantName }: DeleteTenantButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteTenantAction(tenantId);
        if (res.success) {
          toast.success(res.message || `Studio "${tenantName}" has been permanently deleted.`);
          setOpen(false);
        } else {
          toast.error(res.error || 'Failed to delete studio.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred while deleting studio.');
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title={`Delete ${tenantName}`}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete {tenantName}</span>
          </Button>
        }
      />
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Delete Studio &quot;{tenantName}&quot;?</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Are you sure? This will permanently delete this test studio and free up its Contact Phone and PAN number. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border/40">
          <AlertDialogCancel disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Permanently Delete</span>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
