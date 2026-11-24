import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getGuestLeadsAction } from '@/actions/marketing.actions';
import { GuestLeadsClient } from './guest-leads-client';
import { FeatureLockGate } from '@/components/billing/feature-lock-gate';
import { getTenantEntitlements } from '@/services/billing/entitlement.service';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Leads & Marketing Hub | Pratima ERP',
  description:
    'Track guest leads captured via Universal Studio QR standees, review AI face recognition matches, and launch zero-cost Click-to-WhatsApp promotional campaigns.',
};

export default async function MarketingHubPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const tenantId = user?.tenantId;

  if (!tenantId && !isSuperAdmin) {
    redirect('/settings/tenant');
  }

  let isUnlocked = isSuperAdmin;
  if (!isUnlocked && tenantId) {
    const entitlements = await getTenantEntitlements(tenantId);
    isUnlocked = entitlements.features.includes('GOOGLE_BUSINESS');
  }

  // Fetch Studio Tenant branding and Universal QR configurations
  const tenant = tenantId
    ? await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          tradeName: true,
          companyLegalName: true,
          slug: true,
          universalStudioQrCode: true,
        },
      })
    : null;

  const studioName =
    tenant?.tradeName || tenant?.companyLegalName || tenant?.name || 'Pratima Photography Studio';

  // Fetch guest leads using the server action
  const leadsResponse = await getGuestLeadsAction(tenantId);
  const initialLeads = leadsResponse.success && leadsResponse.data ? leadsResponse.data : [];

  return (
    <FeatureLockGate featureKey="GOOGLE_BUSINESS" isUnlocked={isUnlocked}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <GuestLeadsClient
          initialLeads={initialLeads}
          studioName={studioName}
          tenantSlug={tenant?.slug || tenant?.id || ''}
          universalQrCode={tenant?.universalStudioQrCode || ''}
        />
      </div>
    </FeatureLockGate>
  );
}
