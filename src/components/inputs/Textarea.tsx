import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseInputProps {
  wrapperClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
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
      <InputWrapper
        id={inputId}
        label={label}
        description={description}
        error={error}
        helperText={helperText}
        required={required}
        className={wrapperClassName}
      >
        <textarea
          id={inputId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus-visible:ring-danger' : 'border-input',
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          {...props}
        />
      </InputWrapper>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
