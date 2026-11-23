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
import { CreatePlanForm } from './create-plan-form';

export function CreatePlanDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 shadow-xs font-semibold text-xs">
            <Plus className="h-4 w-4" />
            <span>Create New Plan</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold font-heading">
            Create Subscription Plan
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure a new SaaS subscription tier for photography studios. Specify pricing, branch and staff quotas, and included messaging credits.
          </DialogDescription>
        </DialogHeader>
        <CreatePlanForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
