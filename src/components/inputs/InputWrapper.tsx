import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BaseInputProps {
  label?: string;
  description?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function InputWrapper({
  label,
  description,
  error,
  helperText,
  required,
  id,
  children,
  className,
}: BaseInputProps & { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            error && 'text-danger'
          )}
        >
          {label}
          {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      
      {children}
      
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
