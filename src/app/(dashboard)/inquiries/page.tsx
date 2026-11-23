import { InquiryService } from '@/services/inquiry.service';
import { InquiryClient, type SerializedInquiry } from './inquiry-client';
import { MasterService } from '@/services/master.service';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';

export default async function InquiriesPage() {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId;
  const currentUserId = session?.user?.id;

  // Fetch inquiries for active and all tabs
  const rawInquiries = await InquiryService.findAll(undefined, undefined, true);
  
  // Explicit Decimal-to-number mapping to prevent Next.js Server-to-Client serialization errors
  const inquiries: SerializedInquiry[] = (Array.isArray(rawInquiries) ? rawInquiries : []).map((inquiry: any) => ({
    ...inquiry,
    budget: inquiry.budget !== null && inquiry.budget !== undefined
      ? (typeof inquiry.budget?.toNumber === 'function'
          ? inquiry.budget.toNumber()
          : Number(inquiry.budget) || null)
      : null,
    lead: inquiry.lead
      ? {
          ...inquiry.lead,
          expectedRevenue:
            inquiry.lead.expectedRevenue !== null && inquiry.lead.expectedRevenue !== undefined
              ? (typeof inquiry.lead.expectedRevenue?.toNumber === 'function'
                  ? inquiry.lead.expectedRevenue.toNumber()
                  : Number(inquiry.lead.expectedRevenue) || null)
              : null,
        }
      : null,
  }));
  
  let leadSources = await MasterService.findAll('leadSource');
  let activeLeadSources = leadSources.filter((ls: any) => ls.isActive);

  if (activeLeadSources.length === 0 && tenantId) {
    const defaults = [
      { name: 'Website', code: 'WEBSITE' },
      { name: 'Instagram', code: 'INSTAGRAM' },
      { name: 'Facebook', code: 'FACEBOOK' },
      { name: 'Referral', code: 'REFERRAL' },
      { name: 'Walk-in', code: 'WALK_IN' },
      { name: 'Google', code: 'GOOGLE' },
      { name: 'Other', code: 'OTHER' },
    ];
    await prisma.leadSource.createMany({
      data: defaults.map((d) => ({
        tenantId,
        name: d.name,
        code: d.code,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    leadSources = await MasterService.findAll('leadSource');
    activeLeadSources = leadSources.filter((ls: any) => ls.isActive);
  }

  // Get active sales executives for assignment
  const users = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, name: true, email: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
        <p className="text-muted-foreground mt-2">
          Manage incoming leads and map them to customers.
        </p>
      </div>

      <InquiryClient 
        initialData={serializePrisma(inquiries)} 
        leadSources={activeLeadSources} 
        users={users} 
        currentUserId={currentUserId}
      />
    </div>
  );
}
