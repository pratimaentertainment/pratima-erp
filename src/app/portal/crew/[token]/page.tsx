import * as React from 'react';
import type { Metadata } from 'next';
import { getCrewPassPreview } from '@/actions/crew-portal.actions';
import { CrewPassClient } from './crew-pass-client';

export const dynamic = 'force-dynamic';

interface CrewPassPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(props: CrewPassPageProps): Promise<Metadata> {
  const params = await props.params;
  const res = await getCrewPassPreview(params.token);

  if (!res.success || !res.data) {
    return {
      title: 'Event Shoot Pass | FRAMIQ',
      description: 'Official digital crew pass for freelance photographers and field cinematographers.',
    };
  }

  return {
    title: `${res.data.functionName} Shoot Pass • ${res.data.studioName}`,
    description: `Official crew shoot pass for ${res.data.crewName} (${res.data.role}) on ${res.data.eventTitle}.`,
  };
}

export default async function CrewPassPage(props: CrewPassPageProps) {
  const params = await props.params;
  const preview = await getCrewPassPreview(params.token);

  return (
    <CrewPassClient
      token={params.token}
      preview={preview}
    />
  );
}
