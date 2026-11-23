import * as React from 'react';
import { EditFormLayout } from '@/components/layout/layouts';

export interface EntityEditPageProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function EntityEditPage({ title, actions, children, footer }: EntityEditPageProps) {
  return (
    <EditFormLayout
      header={title}
      actions={actions}
      footer={footer}
    >
      {children}
    </EditFormLayout>
  );
}
