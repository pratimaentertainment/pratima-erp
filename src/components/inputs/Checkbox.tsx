import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseInputProps {
  wrapperClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      helperText,
      required,
      id,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const fallbackId = React.useId();
    const inputId = id || fallbackId;

    return (
      <div className={cn('flex flex-col space-y-1', wrapperClassName)}>
        <div className="flex items-start space-x-2">
          <div className="relative flex h-5 items-center justify-center">
            <input
              type="checkbox"
              id={inputId}
              className={cn(
                'peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground',
                error && 'border-danger',
                className
              )}
              ref={ref}
              aria-invalid={!!error}
              {...props}
            />
            <Check className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
          </div>
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer pt-0.5',
                error && 'text-danger'
              )}
            >
              {label}
              {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
            </label>
          )}
        </div>
        
        {(description || helperText || error) && (
          <div className="pl-6 flex flex-col space-y-1">
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
            {!error && helperText && (
              <p className="text-sm text-muted-foreground">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
