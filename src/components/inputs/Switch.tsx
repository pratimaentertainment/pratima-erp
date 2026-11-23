import * as React from 'react';
import { cn } from '@/lib/utils';
import { type BaseInputProps } from './InputWrapper';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseInputProps {
  wrapperClassName?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
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
        <div className="flex items-center space-x-2">
          <div className="relative inline-flex items-center">
            {/* The actual hidden input for form integration */}
            <input
              type="checkbox"
              id={inputId}
              role="switch"
              className={cn(
                'peer absolute left-0 top-0 h-full w-full cursor-pointer opacity-0 m-0 z-10 disabled:cursor-not-allowed',
                className
              )}
              ref={ref}
              aria-invalid={!!error}
              {...props}
            />
            {/* The visual switch track */}
            <div className={cn(
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "bg-input peer-checked:bg-primary",
              error && "peer-checked:bg-danger border-danger"
            )}>
              {/* The visual switch thumb */}
              <div className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                "translate-x-0 peer-checked:translate-x-5"
              )} />
            </div>
          </div>
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer',
                error && 'text-danger'
              )}
            >
              {label}
              {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
            </label>
          )}
        </div>
        
        {(description || helperText || error) && (
          <div className="pl-[52px] flex flex-col space-y-1">
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
Switch.displayName = 'Switch';

export { Switch };
