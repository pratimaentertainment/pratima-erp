'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Button, type ButtonProps } from '@/components/buttons/Button';

export interface FormSubmitButtonProps extends Omit<ButtonProps, 'loading'> {
  loadingText?: string;
}

export function FormSubmitButton({
  children,
  loadingText,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { formState } = useFormContext();
  const { isSubmitting } = formState;

  return (
    <Button
      type="submit"
      loading={isSubmitting}
      disabled={disabled || isSubmitting}
      {...props}
    >
      {isSubmitting && loadingText ? loadingText : children}
    </Button>
  );
}
