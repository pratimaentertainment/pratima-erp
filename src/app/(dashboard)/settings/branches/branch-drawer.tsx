'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BranchForm } from './branch-form';

interface BranchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: any;
}

export function BranchDrawer({ open, onOpenChange, branch }: BranchDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{branch ? 'Edit Branch' : 'Add New Branch'}</SheetTitle>
          <SheetDescription>
            {branch ? 'Modify the details of this branch.' : 'Create a new operational branch for the tenant.'}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <BranchForm 
            initialData={branch} 
            onSuccess={() => onOpenChange(false)} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
