import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputWrapper, type BaseInputProps } from './InputWrapper';
import { Calendar } from 'lucide-react';

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseInputProps {
  wrapperClassName?: string;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
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
        <div className="relative flex items-center">
          <input
            id={inputId}
            type="date"
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
              error ? 'border-danger focus-visible:ring-danger' : 'border-input',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            {...props}
          />
          <div className="absolute right-3 flex items-center justify-center text-muted-foreground pointer-events-none">
            <Calendar size={16} />
          </div>
        </div>
      </InputWrapper>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker };
