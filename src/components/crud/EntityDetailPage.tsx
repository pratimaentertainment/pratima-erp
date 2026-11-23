import * as React from 'react';
import { ModuleDetailLayout } from '@/components/layout/layouts';
import { EntityPageHeader, type EntityPageHeaderProps } from './EntityPageHeader';

export interface EntityDetailPageProps {
  header: EntityPageHeaderProps;
  metadata?: React.ReactNode;
  sidebar?: React.ReactNode;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}

export function EntityDetailPage({ header, metadata, sidebar, tabs, children }: EntityDetailPageProps) {
  return (
    <ModuleDetailLayout
      header={
        <EntityPageHeader
          title={header.title}
          subtitle={header.subtitle}
          breadcrumbs={header.breadcrumbs}
          statusBadge={header.statusBadge}
          tags={header.tags}
          primaryAction={header.primaryAction}
          secondaryActions={header.secondaryActions}
          contextMenu={header.contextMenu}
        />
      }
      sidebar={sidebar}
      tabs={tabs}
    >
      <div className="flex flex-col gap-6">
        {metadata && <div className="mb-4">{metadata}</div>}
        {children}
      </div>
    </ModuleDetailLayout>
  );
}
