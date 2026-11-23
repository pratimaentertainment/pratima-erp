import { notFound } from 'next/navigation';
import { MASTER_CONFIGS, MasterEntityName } from '@/lib/master-config';
import { MasterService } from '@/services/master.service';
import { MasterClient } from './master-client';

export default async function MasterEntityPage(props: { params: Promise<{ entity: string }> }) {
  const params = await props.params;
  const entity = params.entity as MasterEntityName;
  const config = MASTER_CONFIGS[entity];

  if (!config) {
    notFound();
  }

  const data = await MasterService.findAll(entity);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
        <p className="text-muted-foreground mt-2">
          Manage {config.title.toLowerCase()} configurations.
        </p>
      </div>

      <MasterClient config={config} initialData={data} />
    </div>
  );
}
