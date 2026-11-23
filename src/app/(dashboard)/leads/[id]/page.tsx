import { LeadService } from '@/services/lead.service';
import { notFound } from 'next/navigation';
import { LeadDetailClient } from './lead-detail-client';

import { FollowUpService } from '@/services/follow-up.service';
import { InvoiceService } from '@/services/finance/invoice.service';
import { serializePrisma } from '@/lib/serialize';

export default async function LeadDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const lead = await LeadService.findById(params.id);
  
  if (!lead) {
    notFound();
  }

  const timeline = await LeadService.getTimeline(params.id);
  const followUps = await FollowUpService.findByLeadId(params.id);
  const invoices = await InvoiceService.findByLeadId(params.id);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Lead: {lead.leadCode}</h1>
        <p className="text-muted-foreground">Manage lead details and pipeline progress.</p>
      </div>
      <LeadDetailClient
        lead={serializePrisma(lead)}
        timeline={serializePrisma(timeline)}
        followUps={serializePrisma(followUps)}
        invoices={serializePrisma(invoices)}
      />
    </div>
  );
}
