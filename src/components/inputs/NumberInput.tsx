import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      label,
      description,
      error,
      helperText,
      required,
      leftIcon,
      rightIcon,
      id,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const fallbackId = React.useId();
    const inputId = id || fallbackId;

    return (
      <InputWrapper
        id={inputId}
        label={label}
        description={description}
        error={error}
        helperText={helperText}
        required={required}
        className={wrapperClassName}
      >
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type="number"
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger focus-visible:ring-danger' : 'border-input',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-muted-foreground pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
      </InputWrapper>
    );
  }
);
NumberInput.displayName = 'NumberInput';

export { NumberInput };
