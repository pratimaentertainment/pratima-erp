'use client';

import * as React from 'react';
import { useForm, FormProvider, type UseFormReturn, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ZodType } from 'zod';
import { toast } from 'sonner';
import { type ActionResponse } from '@/actions/action-response';

export interface FormWrapperProps<TFieldValues extends FieldValues = FieldValues, TContext = any> {
  schema: ZodType<any, any, any>;
  defaultValues?: DefaultValues<TFieldValues>;
  action: (data: TFieldValues) => Promise<ActionResponse<any>>;
  onSuccess?: (data: any, resetForm: () => void) => void;
  onError?: (error: string) => void;
  children: React.ReactNode | ((methods: UseFormReturn<TFieldValues, TContext>) => React.ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  warnOnUnsavedChanges?: boolean;
  successMessage?: string;
}

export function FormWrapper<TFieldValues extends FieldValues, TContext = any>({
  schema,
  defaultValues,
  action,
  onSuccess,
  onError,
  children,
  className,
  resetOnSuccess = false,
  warnOnUnsavedChanges = false,
  successMessage,
}: FormWrapperProps<TFieldValues, TContext>) {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  const {
    handleSubmit,
    setError,
    reset,
    formState: { isDirty },
  } = methods;

  // Unsaved changes detection
  React.useEffect(() => {
    if (!warnOnUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, warnOnUnsavedChanges]);

  const onSubmit = async (data: TFieldValues) => {
    try {
      const response = await action(data);

      if (response.success) {
        toast.success(successMessage || response.message || 'Operation successful');
        if (resetOnSuccess) {
          reset();
        }
        onSuccess?.(response.data, () => reset());
      } else {
        toast.error(response.error || 'Operation failed');
        
        // Automatic fieldErrors mapping
        if (response.fieldErrors) {
          Object.entries(response.fieldErrors).forEach(([field, errors]) => {
            const errList = errors as string[] | undefined;
            if (errList && errList.length > 0) {
              setError(field as any, { type: 'server', message: errList[0] });
            }
          });
        }
        
        onError?.(response.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
      onError?.(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className={className}>
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
}
