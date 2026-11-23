'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RegisterStudioForm } from './register-studio-form';

export function RegisterStudioDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 shadow-xs font-medium">
            <Plus className="h-4 w-4" />
            <span>Register New Studio</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold font-heading">Register New Studio</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Onboard a new photography business into Pratima ERP. Provision tenant isolation, an automated 15-day trial, and tenant owner credentials.
          </DialogDescription>
        </DialogHeader>
        <RegisterStudioForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
