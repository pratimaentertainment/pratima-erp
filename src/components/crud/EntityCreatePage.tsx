import * as React from 'react';
import { CreateFormLayout } from '@/components/layout/layouts';

export interface EntityCreatePageProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  stepper?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function EntityCreatePage({ title, description, stepper, children, footer }: EntityCreatePageProps) {
  return (
    <CreateFormLayout
      header={title}
      description={description}
      stepper={stepper}
      footer={footer}
    >
      {children}
    </CreateFormLayout>
  );
}
