'use client';

import * as React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintTriggerButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PrintTriggerButton({
  className = "gap-2 bg-slate-900 hover:bg-slate-800 text-white",
  variant = 'default',
  size = 'sm'
}: PrintTriggerButtonProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handlePrint}
    >
      <Printer className="h-4 w-4" />
      <span>Print / Save PDF</span>
    </Button>
  );
}
