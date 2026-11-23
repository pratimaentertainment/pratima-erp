import * as React from 'react';
import { Button, type ButtonProps } from './Button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SplitButtonProps extends ButtonProps {
  onDropdownClick: () => void;
  dropdownAriaLabel?: string;
}

const SplitButton = React.forwardRef<HTMLDivElement, SplitButtonProps>(
  ({ className, onDropdownClick, dropdownAriaLabel = 'Open menu', children, size = 'md', variant = 'primary', loading, disabled, leftIcon, fullWidth, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('inline-flex rounded-md shadow-sm', fullWidth && 'w-full flex', className)}>
        <Button
          variant={variant}
          size={size}
          className={cn("rounded-r-none focus-visible:z-10", fullWidth && "flex-1")}
          loading={loading}
          disabled={disabled}
          leftIcon={leftIcon}
          {...props}
        >
          {children}
        </Button>
        <Button
          variant={variant}
          size={size}
          className="rounded-l-none px-2 border-l border-white/20 focus-visible:z-10"
          disabled={disabled || loading}
          onClick={onDropdownClick}
          aria-label={dropdownAriaLabel}
        >
          <ChevronDown size={16} />
        </Button>
      </div>
    );
  }
);
SplitButton.displayName = 'SplitButton';

export { SplitButton };
