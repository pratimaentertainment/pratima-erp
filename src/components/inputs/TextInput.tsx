import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    BaseInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      className,
      type = 'text',
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
            type={type}
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger focus-visible:ring-danger' : 'border-input',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-description` : undefined
            }
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
TextInput.displayName = 'TextInput';

export { TextInput };
