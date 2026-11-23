'use client';

import * as React from 'react';
import { Controller, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from 'react-hook-form';

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
  render: (props: {
    field: any;
    fieldState: any;
    formState: any;
    error?: string;
  }) => React.ReactElement;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ render, ...props }: FormFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      control={control}
      {...props}
      render={({ field, fieldState, formState }) => {
        return render({
          field,
          fieldState,
          formState,
          error: fieldState.error?.message,
        });
      }}
    />
  );
}
