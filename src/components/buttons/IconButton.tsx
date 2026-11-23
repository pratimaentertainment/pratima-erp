import * as React from 'react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string; // Enforce accessibility for icon buttons
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, size = 'md', ...props }, ref) => {
    // Override padding to be equal to height for a square button
    const sizeClasses = {
      xs: 'h-7 w-7 p-0',
      sm: 'h-9 w-9 p-0',
      md: 'h-10 w-10 p-0',
      lg: 'h-11 w-11 p-0',
      xl: 'h-12 w-12 p-0',
    };

    const currentSize = size || 'md';

    return (
      <Button
        ref={ref}
        size={currentSize}
        className={cn(sizeClasses[currentSize], className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

export { IconButton };
