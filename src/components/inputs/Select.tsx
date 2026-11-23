import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    BaseInputProps {
  options: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      description,
      error,
      helperText,
      required,
      options,
      placeholder,
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
        <select
          id={inputId}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus-visible:ring-danger' : 'border-input',
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-[calc(50%-8px)] text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </InputWrapper>
    );
  }
);
Select.displayName = 'Select';

export { Select };
