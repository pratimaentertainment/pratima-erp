'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { CreateBookingModal } from './CreateBookingModal';

export interface CreateBookingTriggerProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  buttonText?: string;
  initialDate?: string | Date;
  onSuccess?: (booking: any) => void;
}

export function CreateBookingTrigger({
  className,
  variant = 'default',
  size = 'default',
  buttonText = 'Create Booking',
  initialDate,
  onSuccess,
}: CreateBookingTriggerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={variant}
        size={size}
        className={className || "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-2 font-medium"}
      >
        <CalendarPlus className="w-4 h-4" />
        {buttonText}
      </Button>

      <CreateBookingModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        initialDate={initialDate}
        onSuccess={onSuccess}
      />
    </>
  );
}
