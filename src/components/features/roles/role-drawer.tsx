'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RoleForm } from './role-form';
import { RoleColumnData } from './columns';

interface RoleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleColumnData | null;
  isCloning: boolean;
}

export function RoleDrawer({ open, onOpenChange, role, isCloning }: RoleDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isCloning ? 'Clone Role' : role ? 'Edit Role' : 'Create Role'}
          </SheetTitle>
          <SheetDescription>
            {isCloning 
              ? `Create a duplicate of the ${role?.name} role.`
              : role 
                ? 'Update the details of the role.' 
                : 'Create a new role for your tenant.'}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <RoleForm 
            role={role} 
            isCloning={isCloning} 
            onSuccess={() => onOpenChange(false)} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
